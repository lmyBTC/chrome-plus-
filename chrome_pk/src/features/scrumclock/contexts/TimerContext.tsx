import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { TimerContextType, TimerState, SprintLog } from '../../../types';
import { storage } from '../../../core/chrome/storage';
import { sync } from '../../../core/api/sync';

// 確保 Chrome API 可用
declare const chrome: any;

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export const useTimer = () => {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
};

interface TimerProviderProps {
  children: React.ReactNode;
}

export const TimerProvider: React.FC<TimerProviderProps> = ({ children }) => {
  const [state, setState] = useState<TimerState>('idle');
  const [timeLeft, setTimeLeft] = useState(0);
  const [currentSprint, setCurrentSprint] = useState<SprintLog | null>(null);
  const [settings, setSettings] = useState({ pomodoroDuration: 25, breakDuration: 5 });
  
  // 白噪音與音效狀態
  const [whiteNoiseEnabled, setWhiteNoiseEnabledState] = useState(false);
  const [whiteNoiseVolume, setWhiteNoiseVolumeState] = useState(0.5);

  // Web Audio API refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const noiseSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // 載入設定與復原狀態
  useEffect(() => {
    const loadState = async () => {
      const userSettings = await storage.getUserSettings();
      setSettings({
        pomodoroDuration: userSettings.pomodoroDuration,
        breakDuration: userSettings.breakDuration
      });
      setWhiteNoiseEnabledState(userSettings.whiteNoiseEnabled || false);
      setWhiteNoiseVolumeState(userSettings.whiteNoiseVolume !== undefined ? userSettings.whiteNoiseVolume : 0.5);

      // 復原背景 Timer
      const savedTimer = await chrome.storage.local.get('activeTimer');
      if (savedTimer.activeTimer) {
        const { state: savedState, endTime, sprint, timeLeft: savedTimeLeft } = savedTimer.activeTimer;
        
        if (savedState === 'running') {
          const remain = Math.max(0, Math.round((endTime - Date.now()) / 1000));
          setTimeLeft(remain);
          setState(remain === 0 ? 'logging' : 'running');
          setCurrentSprint(sprint);
        } else if (savedState === 'paused' || savedState === 'logging' || savedState === 'break') {
          setState(savedState);
          setTimeLeft(savedTimeLeft || 0);
          setCurrentSprint(sprint);
        }
      }
    };
    loadState();
  }, []);

  // 音效合成輔助函數
  const initAudioContext = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const startBrownianNoise = useCallback(() => {
    try {
      initAudioContext();
      const ctx = audioCtxRef.current!;
      
      // 停止先前播放的聲音
      stopBrownianNoise();

      const bufferSize = 2 * ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // 一階低通濾波器合成 Brownian Noise (紅噪音，類似雨聲)
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5;
      }

      const source = ctx.createBufferSource();
      source.buffer = noiseBuffer;
      source.loop = true;

      const gainNode = ctx.createGain();
      gainNode.gain.value = whiteNoiseVolume * 0.15; // 調諧音量大小，防爆音

      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start(0);

      noiseSourceRef.current = source;
      gainNodeRef.current = gainNode;
    } catch (err) {
      console.warn('啟動白噪音失敗:', err);
    }
  }, [whiteNoiseVolume]);

  const stopBrownianNoise = useCallback(() => {
    if (noiseSourceRef.current) {
      try {
        noiseSourceRef.current.stop();
      } catch (e) {}
      noiseSourceRef.current = null;
    }
    gainNodeRef.current = null;
  }, []);

  const playSingingBowl = useCallback(() => {
    try {
      initAudioContext();
      const ctx = audioCtxRef.current!;
      const now = ctx.currentTime;
      
      // 5 個正弦諧頻諧振頻率，疊加出空靈金屬共鳴
      const frequencies = [150, 300, 450, 600, 750];
      const gains = [0.4, 0.2, 0.1, 0.05, 0.02];

      frequencies.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        // 指數級音量衰減
        gainNode.gain.setValueAtTime(gains[idx], now);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 4.0);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 4.0);
      });
    } catch (err) {
      console.warn('播放頌缽音效失敗:', err);
    }
  }, []);

  // 音效狀態機連動
  useEffect(() => {
    if (state === 'running' && whiteNoiseEnabled) {
      startBrownianNoise();
    } else {
      stopBrownianNoise();
    }

    if (state === 'logging') {
      playSingingBowl();
    }
  }, [state, whiteNoiseEnabled, startBrownianNoise, stopBrownianNoise, playSingingBowl]);

  // 音量即時反饋
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.setValueAtTime(whiteNoiseVolume * 0.15, audioCtxRef.current?.currentTime || 0);
    }
  }, [whiteNoiseVolume]);

  // 設定變更保存
  const setWhiteNoiseEnabled = useCallback(async (enabled: boolean) => {
    setWhiteNoiseEnabledState(enabled);
    const userSettings = await storage.getUserSettings();
    userSettings.whiteNoiseEnabled = enabled;
    await storage.saveUserSettings(userSettings);
  }, []);

  const setWhiteNoiseVolume = useCallback(async (volume: number) => {
    setWhiteNoiseVolumeState(volume);
    const userSettings = await storage.getUserSettings();
    userSettings.whiteNoiseVolume = volume;
    await storage.saveUserSettings(userSettings);
  }, []);

  // 計時器邏輯
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (state === 'running' && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev: number) => {
          if (prev <= 1) {
            // 計時結束
            const nextState = 'logging';
            setState(nextState);
            
            // 自動累加關聯任務已消耗番茄數
            if (currentSprint?.missionId) {
              const missionId = currentSprint.missionId;
              chrome.storage.local.get(['activeTimer'], (data: any) => {
                if (!data.activeTimer?.spentPomodoroRecorded) {
                  storage.incrementSpentPomodoro(missionId);
                  chrome.storage.local.set({ 
                    activeTimer: { 
                      state: nextState, 
                      sprint: currentSprint, 
                      timeLeft: 0,
                      spentPomodoroRecorded: true 
                    } 
                  });
                } else {
                  chrome.storage.local.set({ 
                    activeTimer: { 
                      state: nextState, 
                      sprint: currentSprint, 
                      timeLeft: 0,
                      spentPomodoroRecorded: true 
                    } 
                  });
                }
              });
            } else {
              chrome.storage.local.set({ 
                activeTimer: { state: nextState, sprint: currentSprint, timeLeft: 0 } 
              });
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [state, timeLeft, currentSprint]);

  const startSprint = useCallback(async (missionId: string, customDurationMinutes?: number) => {
    const durationToUse = customDurationMinutes || settings.pomodoroDuration;
    const sprint: SprintLog = {
      sprintId: uuidv4(),
      missionId,
      startTime: Date.now(),
      endTime: 0,
      result: '',
      interruptionCount: 0,
      interruptionReasons: []
    };

    setCurrentSprint(sprint);
    setTimeLeft(durationToUse * 60);
    setState('running');

    // 取得任務文字
    const missions = await storage.getWeeklyMissions();
    const missionText = missions.find(m => m.id === missionId)?.text || '專注衝刺';
    const calculatedEndTime = Date.now() + durationToUse * 60 * 1000;

    // 儲存到 Local Storage
    chrome.storage.local.set({
      activeTimer: {
        state: 'running',
        endTime: calculatedEndTime,
        sprint: sprint,
        missionText: missionText,
        spentPomodoroRecorded: false
      }
    });

    // 通知 background script 啟用專注模式與鬧鐘
    if (chrome.runtime?.sendMessage) {
      try {
        chrome.runtime.sendMessage({
          type: 'START_FOCUS_MODE',
          payload: { missionId, missionText, duration: durationToUse }
        });
      } catch (err) {
        console.warn('發送訊息失敗 (可能 Context 已失效):', err);
      }
    }
  }, [settings.pomodoroDuration]);

  const pauseSprint = useCallback((reason?: string) => {
    if (state === 'running') {
      setState('paused');
      let updatedSprint = currentSprint;
      if (reason && currentSprint) {
        updatedSprint = {
          ...currentSprint,
          interruptionCount: (currentSprint.interruptionCount || 0) + 1,
          interruptionReasons: [...(currentSprint.interruptionReasons || []), reason]
        };
        setCurrentSprint(updatedSprint);
      }
      chrome.storage.local.set({ activeTimer: { state: 'paused', timeLeft, sprint: updatedSprint } });
      if (chrome.runtime?.sendMessage) {
        try {
          chrome.runtime.sendMessage({ type: 'STOP_FOCUS_MODE' });
        } catch (err) {
          console.warn('發送訊息失敗:', err);
        }
      }
    }
  }, [state, timeLeft, currentSprint]);

  const recordInterruption = useCallback((reason: string) => {
    if (!currentSprint) return;
    const trimmed = reason.trim();
    if (!trimmed) return;
    const updatedSprint: SprintLog = {
      ...currentSprint,
      interruptionCount: (currentSprint.interruptionCount || 0) + 1,
      interruptionReasons: [...(currentSprint.interruptionReasons || []), trimmed]
    };
    setCurrentSprint(updatedSprint);
    chrome.storage.local.get('activeTimer', (res: Record<string, any>) => {
      if (res.activeTimer) {
        chrome.storage.local.set({
          activeTimer: {
            ...res.activeTimer,
            sprint: updatedSprint
          }
        });
      }
    });
  }, [currentSprint]);

  const resumeSprint = useCallback(async () => {
    if (state === 'paused') {
      setState('running');
      
      const calculatedEndTime = Date.now() + timeLeft * 1000;
      const missions = await storage.getWeeklyMissions();
      const missionText = missions.find(m => m.id === currentSprint?.missionId)?.text || '專注衝刺';

      chrome.storage.local.set({
        activeTimer: { 
          state: 'running', 
          endTime: calculatedEndTime, 
          sprint: currentSprint,
          missionText: missionText
        }
      });
      if (chrome.runtime?.sendMessage) {
        try {
          chrome.runtime.sendMessage({
            type: 'START_FOCUS_MODE',
            payload: {
              duration: timeLeft / 60,
              missionId: currentSprint?.missionId,
              missionText: missionText
            }
          });
        } catch (err) {
          console.warn('發送訊息失敗:', err);
        }
      }
    }
  }, [state, timeLeft, currentSprint]);

  const stopSprint = useCallback(() => {
    setState('idle');
    setTimeLeft(0);
    setCurrentSprint(null);
    chrome.storage.local.remove('activeTimer');

    // 通知 background script 停用專注模式
    if (chrome.runtime?.sendMessage) {
      try {
        chrome.runtime.sendMessage({
          type: 'STOP_FOCUS_MODE'
        });
      } catch (err) {
        console.warn('發送訊息失敗:', err);
      }
    }
  }, []);

  const logResult = useCallback(async (result: string) => {
    if (!currentSprint) return;

    const completedSprint: SprintLog = {
      ...currentSprint,
      endTime: Date.now(),
      result
    };

    // 儲存衝刺記錄
    const todayLog = await storage.getTodayLog();
    todayLog.sprintLogs.push(completedSprint);
    await storage.saveTodayLog(todayLog);

    // 背景同步至 Google Sheets 與 Calendar
    storage.getWeeklyMissions().then(missions => {
      const missionText = missions.find(m => m.id === completedSprint.missionId)?.text || completedSprint.missionId;
      sync.pushSprintLog(completedSprint, missionText);
      sync.pushToCalendar(missionText, completedSprint.startTime, completedSprint.endTime, `衝刺成果: ${result}`);
    }).catch(err => console.error(err));

    setCurrentSprint(null);
    setState('break');
    setTimeLeft(settings.breakDuration * 60);
    chrome.storage.local.set({
      activeTimer: { state: 'break', endTime: Date.now() + settings.breakDuration * 60 * 1000, sprint: null }
    });

    // 通知 background script 停用專注模式
    if (chrome.runtime?.sendMessage) {
      try {
        chrome.runtime.sendMessage({
          type: 'STOP_FOCUS_MODE'
        });
      } catch (err) {
        console.warn('發送訊息失敗:', err);
      }
    }
  }, [currentSprint, settings.breakDuration]);

  const value: TimerContextType = {
    state,
    timeLeft,
    currentSprint,
    startSprint,
    pauseSprint,
    resumeSprint,
    stopSprint,
    logResult,
    recordInterruption,
    whiteNoiseEnabled,
    setWhiteNoiseEnabled,
    whiteNoiseVolume,
    setWhiteNoiseVolume
  };

  return (
    <TimerContext.Provider value={value}>
      {children}
    </TimerContext.Provider>
  );
}; 