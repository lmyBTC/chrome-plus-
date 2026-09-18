import { useState, useEffect, useRef } from 'react';
import { getAICore, checkAiCapabilities, safeExtractJSON } from '../../../utils/ai-helper';
import { AIActionSchema } from '../../../utils/ai-schemas';
import { CHAT_SYSTEM_PROMPT, PARSE_SYSTEM_PROMPT } from '../../../utils/ai-prompts';
import { StorageQueue } from '../../../core/chrome/storageQueue';

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

  const createSafeAISession = async (aiAPI: any, systemPrompt: string) => {
    try {
      return await aiAPI.create({
        systemPrompt,
        expectedInputs: [{ type: 'text', languages: ['en'] }],
        expectedOutputs: [{ type: 'text', languages: ['en'] }]
      });
    } catch {
      try {
        return await aiAPI.create({ systemPrompt });
      } catch {
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
- **估計時間**：${data.estimatedPomodoros || 1} 🍅`
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

/**
 * 統一 Webhook 廣播函式 (支援 GAS 統一路由與離線佇列重試)
 */
async function triggerWebhook(event: string, payload: any) {
  try {
    const result = await chrome.storage.local.get('userSettings');
    const settings = result.userSettings;
    if (!settings || !settings.enableWebhook || !settings.webhookUrl) {
      return;
    }

    const taskText = payload.text || payload.missionText || payload.title || '專注衝刺';
    const ticker = (payload.ticker || extractTickerFromText(taskText, payload.tags) || '').toUpperCase();
    const tags = Array.isArray(payload.tags) ? payload.tags : (payload.tag ? [payload.tag] : []);
    const pomodoros = Number(payload.completedPomodoros || 1);
    const estimated = Number(payload.estimatedPomodoros || pomodoros);
    const durationMin = Number(payload.durationMinutes || (pomodoros * 25));

    const webhookEnvelope = {
      protocolVersion: 1,
      action: 'scrum_sync',
      event: event,
      secretToken: settings.webhookSecretToken || undefined,
      timestamp: Date.now(),
      data: {
        id: payload.id || `log-${Date.now()}`,
        text: taskText,
        ticker: ticker,
        tags: tags,
        completedPomodoros: pomodoros,
        estimatedPomodoros: estimated,
        durationMinutes: durationMin,
        status: payload.status || (event.includes('completed') ? 'completed' : 'logged'),
        notes: payload.notes || '',
        completedAt: new Date().toLocaleString('zh-TW', { hour12: false })
      },
      payload: payload
    };

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await enqueuePendingWebhook(webhookEnvelope);
      return;
    }

    fetch(settings.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(webhookEnvelope)
    }).then(async (res) => {
      if (res.ok) {
        flushPendingWebhooks(settings.webhookUrl);
      } else {
        await enqueuePendingWebhook(webhookEnvelope);
      }
    }).catch(async (err) => {
      console.warn('Webhook 發送失敗，寫入離線暫存佇列:', err);
      await enqueuePendingWebhook(webhookEnvelope);
    });
  } catch (err) {
    console.warn('讀取 Webhook 設定或發送失敗:', err);
  }
}

async function enqueuePendingWebhook(envelope: any) {
  try {
    const res = await chrome.storage.local.get('pendingWebhookQueue');
    const queue = Array.isArray(res.pendingWebhookQueue) ? res.pendingWebhookQueue : [];
    queue.push(envelope);
    if (queue.length > 100) queue.shift();
    await chrome.storage.local.set({ pendingWebhookQueue: queue });
  } catch (e) {
    console.warn('離線暫存佇列寫入失敗:', e);
  }
}

async function flushPendingWebhooks(url: string) {
  try {
    const res = await chrome.storage.local.get('pendingWebhookQueue');
    const queue = res.pendingWebhookQueue;
    if (!Array.isArray(queue) || queue.length === 0) return;

    await chrome.storage.local.set({ pendingWebhookQueue: [] });

    for (const item of queue) {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(item)
      }).catch(err => {
        console.warn('補送暫存 Webhook 失敗:', err);
      });
    }
  } catch (e) {
    console.warn('排空暫存佇列失敗:', e);
  }
}

function extractTickerFromText(text: string, tags?: string[]): string {
  if (Array.isArray(tags)) {
    for (const t of tags) {
      const clean = t.replace(/^[#$]/, '').trim();
      if (/^[A-Za-z]{1,5}$/.test(clean) && clean.toUpperCase() !== 'TASK') {
        return clean.toUpperCase();
      }
    }
  }
  const match = (text || '').match(/\$([A-Za-z]{1,5})\b/);
  return match ? match[1].toUpperCase() : '';
}
