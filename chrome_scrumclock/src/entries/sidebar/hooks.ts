import React, { useState, useEffect, useRef } from 'react';
import { getAICore, checkAiCapabilities, safeExtractJSON } from '../../utils/ai-helper';
import { AIActionSchema } from '../../utils/ai-schemas';
import { CHAT_SYSTEM_PROMPT, PARSE_SYSTEM_PROMPT } from '../../utils/ai-prompts';

// 序列化非同步任務的 Storage 佇列 (避免 Race Condition)
export class StorageQueue {
  private queue: Promise<any> = Promise.resolve();

  enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue = this.queue.then(async () => {
        try {
          const res = await task();
          resolve(res);
        } catch (err) {
          reject(err);
        }
      });
    });
  }
}

/**
 * 計時器狀態同步 Hook
 */
export function useTimerSync(onSprintReviewTrigger: (sprint: any) => void) {
  const [activeTimer, setActiveTimer] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    chrome.storage.local.get('activeTimer', (result) => {
      if (result.activeTimer) {
        setActiveTimer(result.activeTimer);
      }
    });

    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, namespace: string) => {
      if (namespace === 'local' && changes.activeTimer) {
        setActiveTimer(changes.activeTimer.newValue);
      }
    };
    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  useEffect(() => {
    let timerId: any = null;
    if (activeTimer && activeTimer.state === 'running' && activeTimer.endTime) {
      const updateTime = () => {
        const remaining = Math.max(0, activeTimer.endTime - Date.now());
        setTimeLeft(Math.ceil(remaining / 1000));
        
        if (remaining <= 0) {
          clearInterval(timerId);
          onSprintReviewTrigger(activeTimer.sprint);
        }
      };
      updateTime();
      timerId = setInterval(updateTime, 1000);
    } else if (activeTimer && activeTimer.state === 'paused') {
      setTimeLeft(Math.ceil((activeTimer.timeLeft || 0) / 1000));
    } else if (activeTimer && activeTimer.state === 'break' && activeTimer.endTime) {
      const updateTime = () => {
        const remaining = Math.max(0, activeTimer.endTime - Date.now());
        setTimeLeft(Math.ceil(remaining / 1000));
        if (remaining <= 0) {
          clearInterval(timerId);
        }
      };
      updateTime();
      timerId = setInterval(updateTime, 1000);
    } else {
      setTimeLeft(0);
    }

    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [activeTimer]);

  return { activeTimer, timeLeft };
}

/**
 * 右鍵選單擷取文字監聽 Hook
 */
export function useContextMenuSync(onPendingTextReceived: (pendingData: any) => void) {
  useEffect(() => {
    chrome.storage.local.get('pendingAnalyzeText', (result) => {
      if (result.pendingAnalyzeText) {
        onPendingTextReceived(result.pendingAnalyzeText);
      }
    });

    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, namespace: string) => {
      if (namespace === 'local' && changes.pendingAnalyzeText?.newValue) {
        onPendingTextReceived(changes.pendingAnalyzeText.newValue);
      }
    };
    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [onPendingTextReceived]);
}

export interface Message {
  role: 'user' | 'model' | 'system';
  content: string;
}

/**
 * 本地 AI 會話與意圖指令更新 Hook
 */
export function useAISession(storageQueue: StorageQueue) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [aiAvailable, setAiAvailable] = useState<'yes' | 'no' | 'checking'>('checking');
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const aiSessionRef = useRef<any>(null);
  const parseSessionRef = useRef<any>(null);

  useEffect(() => {
    checkAndInitAI();

    return () => {
      if (aiSessionRef.current) {
        try {
          aiSessionRef.current.destroy();
        } catch (e) {
          console.error('銷毀 AI session 失敗:', e);
        }
      }
      if (parseSessionRef.current) {
        try {
          parseSessionRef.current.destroy();
        } catch (e) {
          console.error('銷毀 AI 解析會話失敗:', e);
        }
      }
    };
  }, []);

  // 安全建立 Chrome Prompt API 會話（解決 Unsupported LanguageModel API languages: [de, en, es, fr, ja] 報錯）
  const createSafeAISession = async (aiAPI: any, systemPrompt: string) => {
    // 嘗試 1: 使用合規的 ISO 語言代碼 (Chrome Nano 目前白名單: de, en, es, fr, ja)
    try {
      return await aiAPI.create({
        systemPrompt,
        expectedInputs: [{ type: 'text', languages: ['en'] }],
        expectedOutputs: [{ type: 'text', languages: ['en'] }]
      });
    } catch {
      // 嘗試 2: 若舊版或新版不需 expectedInputs，僅傳入 systemPrompt
      try {
        return await aiAPI.create({ systemPrompt });
      } catch {
        // 嘗試 3: 無參數直接建立
        return await aiAPI.create();
      }
    }
  };

  const checkAndInitAI = async () => {
    try {
      const aiAPI = getAICore();
      const isAvailable = await checkAiCapabilities(aiAPI);
      if (!isAvailable) {
        setAiAvailable('no');
        setIsInitializing(false);
        return;
      }

      setAiAvailable('yes');
      
      aiSessionRef.current = await createSafeAISession(aiAPI, CHAT_SYSTEM_PROMPT);

      try {
        parseSessionRef.current = await createSafeAISession(aiAPI, PARSE_SYSTEM_PROMPT);
      } catch (e) {
        console.warn('建立常駐意圖解析會話失敗，將於執行時動態建立:', e);
      }

      setMessages([
        {
          role: 'model',
          content: '👋 你好！我是你的 PK+ 助理。我已準備就緒，可以幫你評估今日的任務、拆解番茄鐘或提供敏捷開發建議。有什麼需要幫忙的嗎？'
        }
      ]);
      setIsInitializing(false);
    } catch (error) {
      console.error('初始化內建 AI 失敗:', error);
      setAiAvailable('no');
      setIsInitializing(false);
    }
  };

  const handleProjectActionUpdate = async (data: {
    actionType: 'create' | 'update';
    projectName: string;
    progressPercent: number;
    statusSummary: string;
  }) => {
    try {
      await storageQueue.enqueue(async () => {
        const result = await chrome.storage.local.get('weeklyMissions');
        const missions: any[] = result.weeklyMissions || [];
        
        const cleanTargetName = data.projectName.trim().toLowerCase();
        const index = missions.findIndex(m => {
          const cleanMissionName = m.text.trim().toLowerCase();
          return cleanMissionName.includes(cleanTargetName) || cleanTargetName.includes(cleanMissionName);
        });
        
        let updatedMissions = [...missions];
        let finalActionText = '';
        
        if (index !== -1 && data.actionType === 'update') {
          const originalMission = updatedMissions[index];
          updatedMissions[index] = {
            ...originalMission,
            progressPercent: data.progressPercent,
            notes: data.statusSummary ? `當前狀態：${data.statusSummary}` : originalMission.notes,
            isCompleted: data.progressPercent === 100,
            completedAt: data.progressPercent === 100 ? new Date().toLocaleString() : originalMission.completedAt
          };
          finalActionText = `更新專案「${originalMission.text}」`;
        } else {
          const newMission = {
            id: 'mission-' + Date.now(),
            text: data.projectName,
            isCompleted: data.progressPercent === 100,
            progressPercent: data.progressPercent,
            notes: data.statusSummary ? `當前狀態：${data.statusSummary}` : '無狀態描述',
            createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
            priority: 'P2' as const,
            completedAt: data.progressPercent === 100 ? new Date().toLocaleString() : undefined
          };
          updatedMissions.push(newMission);
          finalActionText = `新增專案「${data.projectName}」`;
        }
        
        await chrome.storage.local.set({ weeklyMissions: updatedMissions });
        
        triggerWebhook('project_updated', {
          projectName: data.projectName,
          actionType: data.actionType,
          progressPercent: data.progressPercent,
          statusSummary: data.statusSummary,
          finalActionText
        });
        
        setMessages(prev => [
          ...prev,
          {
            role: 'model',
            content: `🤖 **本機 AI 專案進度更新助理**
            
✅ **${finalActionText} 成功！**
- **進度百分比**：${data.progressPercent}%
- **當前狀態/卡點**：${data.statusSummary || '無'}
- **完成狀態**：${data.progressPercent === 100 ? '🎉 已完成 (DONE)' : '⏳ 進行中 (IN_PROGRESS)'}`
          }
        ]);
      });
    } catch (error) {
      console.error('更新專案儲存失敗:', error);
      setMessages(prev => [
        ...prev,
        { role: 'system', content: '❌ 更新本機專案進度至 Storage 時發生錯誤。' }
      ]);
    }
  };

  const handleDailyMissionActionUpdate = async (data: {
    actionType: 'create' | 'complete' | 'delete';
    targetName: string;
    estimatedPomodoros?: number;
    statusSummary?: string;
  }) => {
    try {
      await storageQueue.enqueue(async () => {
        const resultMissions = await chrome.storage.local.get('weeklyMissions');
        const resultLogs = await chrome.storage.local.get('dailyLogs');
        
        const weeklyMissions = resultMissions.weeklyMissions || [];
        const dailyLogs = resultLogs.dailyLogs || {};
        const today = new Date().toISOString().split('T')[0];
        
        if (!dailyLogs[today]) {
          dailyLogs[today] = {
            date: today,
            coreBattles: [],
            sprintLogs: [],
            review: null
          };
        }
        
        const coreBattles: any[] = dailyLogs[today].coreBattles || [];
        const cleanTargetName = data.targetName.trim().toLowerCase();
        
        const findMissionIndex = () => {
          return weeklyMissions.findIndex((m: any) => {
            const cleanMissionName = m.text.trim().toLowerCase();
            return cleanMissionName.includes(cleanTargetName) || cleanTargetName.includes(cleanMissionName);
          });
        };
        
        let updatedMissions = [...weeklyMissions];
        let updatedBattles = [...coreBattles];
        let finalActionText = '';
        
        if (data.actionType === 'create') {
          let missionId = '';
          const index = findMissionIndex();
          
          if (index !== -1) {
            missionId = weeklyMissions[index].id;
            if (!coreBattles.some((b: any) => b.missionId === missionId)) {
              updatedBattles.push({
                missionId: missionId,
                committedTime: '09:00-10:00'
              });
              finalActionText = `將已有任務「${weeklyMissions[index].text}」加入今日戰役`;
            } else {
              finalActionText = `任務「${weeklyMissions[index].text}」已在今日戰役中`;
            }
          } else {
            const newId = 'mission-' + Date.now();
            const newMission = {
              id: newId,
              text: data.targetName,
              isCompleted: false,
              createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
              priority: 'P2' as const
            };
            updatedMissions.push(newMission);
            
            updatedBattles.push({
              missionId: newId,
              committedTime: '09:00-10:00'
            });
            finalActionText = `新增任務「${data.targetName}」並加入今日戰役`;
          }
        } else if (data.actionType === 'complete') {
          const index = findMissionIndex();
          if (index !== -1) {
            const targetMission = updatedMissions[index];
            updatedMissions[index] = {
              ...targetMission,
              isCompleted: true,
              completedAt: new Date().toLocaleString()
            };
            finalActionText = `已將任務「${targetMission.text}」標記為完成`;
          } else {
            finalActionText = `找不到與「${data.targetName}」匹配的任務以標記完成`;
          }
        } else if (data.actionType === 'delete') {
          const index = findMissionIndex();
          if (index !== -1) {
            const missionId = weeklyMissions[index].id;
            updatedBattles = coreBattles.filter((b: any) => b.missionId !== missionId);
            finalActionText = `已將任務「${weeklyMissions[index].text}」從今日戰役中移除`;
          } else {
            updatedBattles = coreBattles.filter((b: any) => {
              const m = weeklyMissions.find((mission: any) => mission.id === b.missionId);
              if (m) {
                return !m.text.toLowerCase().includes(cleanTargetName);
              }
              return true;
            });
            finalActionText = `已從今日戰役中移除與「${data.targetName}」相關的任務`;
          }
        }
        
        await chrome.storage.local.set({ 
          weeklyMissions: updatedMissions,
          dailyLogs: {
            ...dailyLogs,
            [today]: {
              ...dailyLogs[today],
              coreBattles: updatedBattles
            }
          }
        });
        
        let eventType: 'task_created' | 'task_completed' | 'task_deleted' = 'task_created';
        if (data.actionType === 'complete') eventType = 'task_completed';
        else if (data.actionType === 'delete') eventType = 'task_deleted';
        
        triggerWebhook(eventType, {
          targetName: data.targetName,
          actionType: data.actionType,
          estimatedPomodoros: data.estimatedPomodoros || 1,
          finalActionText
        });
        
        setMessages(prev => [
          ...prev,
          {
            role: 'model',
            content: `🤖 **本機 AI 每日任務管理助理**
            
✅ **${finalActionText} 成功！**
- **操作類型**：${data.actionType === 'create' ? '新增今日任務' : data.actionType === 'complete' ? '標記任務完成' : '移除今日任務'}
- **任務名稱**：${data.targetName}
- **估估時間**：${data.estimatedPomodoros || 1} 🍅`
          }
        ]);
      });
    } catch (error) {
      console.error('更新每日任務儲存失敗:', error);
      setMessages(prev => [
        ...prev,
        { role: 'system', content: '❌ 更新本機每日任務至 Storage 時發生錯誤。' }
      ]);
    }
  };

  const handleSend = async (customText?: string) => {
    const textToProcess = customText || inputText;
    if (!textToProcess.trim() || isSending || aiAvailable !== 'yes') return;

    if (!customText) {
      setInputText('');
    }
    setMessages(prev => [...prev, { role: 'user', content: textToProcess }]);
    setIsSending(true);

    try {
      const aiAPI = getAICore();
      if (!aiAPI) {
        throw new Error('無法取得本地 AI API 呼叫路徑。');
      }

      let isProjectActionProcessed = false;
      let parseSession: any = parseSessionRef.current;
      let isTempSession = false;

      try {
        if (!parseSession) {
          console.warn('常駐意圖解析會話不存在，現場建立臨時會話...');
          parseSession = await createSafeAISession(aiAPI, PARSE_SYSTEM_PROMPT);
          isTempSession = true;
        }

        const analysisResult = await parseSession.prompt(`請分析這句話並提取專案與任務進度資料：「${textToProcess}」`);
        const data = safeExtractJSON(analysisResult);
        if (data.isAction) {
          const validated = AIActionSchema.safeParse(data);
          if (!validated.success) {
            console.error("AI 語意解析校驗失敗:", validated.error);
            setMessages(prev => [...prev, { role: 'system', content: '❌ 語意解析格式有誤，請再試一次。' }]);
            isProjectActionProcessed = true;
          } else {
            const validatedData = validated.data;
            if (validatedData.isAction) {
              if (validatedData.intentType === 'project') {
                await handleProjectActionUpdate({
                  actionType: validatedData.actionType as 'create' | 'update',
                  projectName: validatedData.targetName,
                  progressPercent: validatedData.progressPercent,
                  statusSummary: validatedData.statusSummary
                });
                isProjectActionProcessed = true;
              } else if (validatedData.intentType === 'daily_mission') {
                await handleDailyMissionActionUpdate({
                  actionType: validatedData.actionType as 'create' | 'complete' | 'delete',
                  targetName: validatedData.targetName,
                  estimatedPomodoros: validatedData.estimatedPomodoros,
                  statusSummary: validatedData.statusSummary
                });
                isProjectActionProcessed = true;
              }
            }
          }
        }
      } catch (e) {
        console.warn('解析專案/任務意圖失敗或為非操作意圖，轉為一般對話:', e);
      } finally {
        if (isTempSession && parseSession) {
          try {
            parseSession.destroy();
          } catch (destroyErr) {
            console.error('銷毀臨時解析會話失敗:', destroyErr);
          }
        }
      }

      if (!isProjectActionProcessed) {
        if (!aiSessionRef.current) {
          aiSessionRef.current = await createSafeAISession(aiAPI, CHAT_SYSTEM_PROMPT);
        }

        const response = await aiSessionRef.current.prompt(textToProcess);
        setMessages(prev => [...prev, { role: 'model', content: response }]);
      }
    } catch (error) {
      console.error('AI 回應失敗:', error);
      setMessages(prev => [...prev, { role: 'system', content: '❌ AI 助理思考中發生錯誤，請稍後再試。' }]);
    } finally {
      setIsSending(false);
    }
  };

  return {
    messages,
    setMessages,
    inputText,
    setInputText,
    aiAvailable,
    isInitializing,
    isSending,
    setIsSending,
    handleSend,
    aiSessionRef,
    checkAndInitAI
  };
}

async function triggerWebhook(event: string, payload: any) {
  try {
    const result = await chrome.storage.local.get('userSettings');
    const settings = result.userSettings;
    if (!settings || !settings.enableWebhook || !settings.webhookUrl) {
      return;
    }

    const webhookData = {
      event,
      timestamp: new Date().toISOString(),
      payload
    };

    fetch(settings.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookData)
    }).catch(err => {
      console.warn('Webhook 發送失敗:', err);
    });
  } catch (err) {
    console.warn('讀取 Webhook 設定失敗:', err);
  }
}
