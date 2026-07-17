import React, { useState, useEffect, useRef } from 'react';
import { getAICore, checkAiCapabilities, safeExtractJSON } from '../../utils/ai-helper';

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
      
      const createOptions: any = {
        systemPrompt: `你是一個專業的 Scrum 敏捷開發與番茄鐘助理。
你會幫助使用者評估任務優先順序、拆解子任務、估算番茄鐘數量，並給予專注力與效率建議。
請使用「繁體中文」進行回答，回答要簡短、俐落、精準且富有鼓勵語氣。`,
        expectedInputs: [{ type: 'text', languages: ['zh', 'en'] }],
        expectedOutputs: [{ type: 'text', languages: ['zh'] }]
      };

      try {
        aiSessionRef.current = await aiAPI.create(createOptions);
      } catch (error) {
        delete createOptions.expectedInputs;
        delete createOptions.expectedOutputs;
        aiSessionRef.current = await aiAPI.create(createOptions);
      }

      const parseOptions: any = {
        systemPrompt: `你是一個專案管理資料分析師。你的唯一工作是分析使用者的口語指令或進度報告，判斷使用者是否有以下兩類意圖之一：
1. 每週專案操作 (project)：
   意圖為每週專案的「新增」或「更新進度百分比與狀態描述」。
   特徵如：「新增專案...」、「更新專案...」、「專案目前完成幾%」、「卡在某問題」等。
2. 今日每日任務操作 (daily_mission)：
   意圖為今日核心戰役/每日任務的「新增」、「完成/標記完成」、「刪除/移除」。
   特徵如：「新增每日任務...」、「新增今日任務...」、「今日任務新增...」、「把...標記為完成」、「完成...任務」、「刪除每日任務...」、「移除今日戰役...」等。

請注意：如果只說「新增任務 ...」而沒有特別提及是專案還是每日任務，且沒有百分比，請優先判定為今日每日任務 (daily_mission)。

你必須「只」輸出 JSON 格式，不要包含任何 Markdown 包裹（如 \`\`\`json 標記）或額外文字說明，格式必須如下：
{
  "isAction": true,
  "intentType": "project" | "daily_mission",
  "actionType": "create" | "update" | "complete" | "delete",
  "targetName": "提取的專案名稱或任務名稱",
  "progressPercent": 數字 (僅專案進度更新時需要，為 0-100 的整數，否則填 0),
  "statusSummary": "提取的狀態描述或執行備註 (若無則填空字串)",
  "estimatedPomodoros": 數字 (僅每日任務新增時需要，估算番茄鐘數，若口語中有提到幾顆番茄鐘則填對應數字，否則預設為 1)
}
如果既不是專案操作端也不是每日任務操作（例如一般問答、日常對話、無關的諮詢、要求拆解但沒有直接要加入任務等），你必須只輸出：
{
  "isAction": false
}

【意圖判定範例】
輸入：「幫我把 實作登入頁面 加入今日戰役」
輸出：{"isAction":true,"intentType":"daily_mission","actionType":"create","targetName":"實作登入頁面","progressPercent":0,"statusSummary":"","estimatedPomodoros":1}

輸入：「我已經完成了 撰寫測試案例」
輸出：{"isAction":true,"intentType":"daily_mission","actionType":"complete","targetName":"撰寫測試案例","progressPercent":0,"statusSummary":"","estimatedPomodoros":1}

輸入：「更新我的 ScrumClock 專案進度到 80%，目前正在優化 UI」
輸出：{"isAction":true,"intentType":"project","actionType":"update","targetName":"ScrumClock","progressPercent":80,"statusSummary":"目前正在優化 UI","estimatedPomodoros":1}

輸入：「你覺得敏捷開發跟瀑布流開發差在哪裡？」
輸出：{"isAction":false}`,
        expectedInputs: [{ type: 'text', languages: ['zh', 'en'] }],
        expectedOutputs: [{ type: 'text', languages: ['zh'] }]
      };

      try {
        parseSessionRef.current = await aiAPI.create(parseOptions);
      } catch (parseError) {
        try {
          delete parseOptions.expectedInputs;
          delete parseOptions.expectedOutputs;
          parseSessionRef.current = await aiAPI.create(parseOptions);
        } catch (e) {
          console.warn('建立常駐意圖解析會話失敗，將於執行時動態建立:', e);
        }
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
          const parseOptions: any = {
            systemPrompt: `你是一個專案管理資料分析師。你的唯一工作是分析使用者的口語指令或進度報告，判斷使用者是否有以下兩類意圖之一：
1. 每週專案操作 (project)：
   意圖為每週專案的「新增」或「更新進度百分比與狀態描述」。
   特徵如：「新增專案...」、「更新專案...」、「專案目前完成幾%」、「卡在某問題」等。
2. 今日每日任務操作 (daily_mission)：
   意圖為今日核心戰役/每日任務的「新增」、「完成/標記完成」、「刪除/移除」。
   特徵如：「新增每日任務...」、「新增今日任務...」、「今日任務新增...」、「把...標記為完成」、「完成...任務」、「刪除每日任務...」、「移除今日戰役...」等。

請注意：如果只說「新增任務 ...」而沒有特別提及是專案還是每日任務，且沒有百分比，請優先判定為今日每日任務 (daily_mission)。

你必須「只」輸出 JSON 格式，不要包含任何 Markdown 包裹（如 \`\`\`json 標記）或額外文字說明，格式必須如下：
{
  "isAction": true,
  "intentType": "project" | "daily_mission",
  "actionType": "create" | "update" | "complete" | "delete",
  "targetName": "提取的專案名稱或任務名稱",
  "progressPercent": 數字 (僅專案進度更新時需要，為 0-100 的整數，否則填 0),
  "statusSummary": "提取的狀態描述或執行備註 (若無則填空字串)",
  "estimatedPomodoros": 數字 (僅每日任務新增時需要，估算番茄鐘數，若口語中有提到幾顆番茄鐘則填對應數字，否則預設為 1)
}
如果既不是專案操作端也不是每日任務操作（例如一般問答、日常對話、無關的諮詢、要求拆解但沒有直接要加入任務等），你必須只輸出：
{
  "isAction": false
}

【意圖判定範例】
輸入：「幫我把 實作登入頁面 加入今日戰役」
輸出：{"isAction":true,"intentType":"daily_mission","actionType":"create","targetName":"實作登入頁面","progressPercent":0,"statusSummary":"","estimatedPomodoros":1}

輸入：「我已經完成了 撰寫測試案例」
輸出：{"isAction":true,"intentType":"daily_mission","actionType":"complete","targetName":"撰寫測試案例","progressPercent":0,"statusSummary":"","estimatedPomodoros":1}

輸入：「更新我的 ScrumClock 專案進度到 80%，目前正在優化 UI」
輸出：{"isAction":true,"intentType":"project","actionType":"update","targetName":"ScrumClock","progressPercent":80,"statusSummary":"目前正在優化 UI","estimatedPomodoros":1}

輸入：「你覺得敏捷開發跟瀑布流開發差在哪裡？」
輸出：{"isAction":false}`,
            expectedInputs: [{ type: 'text', languages: ['zh', 'en'] }],
            expectedOutputs: [{ type: 'text', languages: ['zh'] }]
          };

          try {
            parseSession = await aiAPI.create(parseOptions);
          } catch (e) {
            delete parseOptions.expectedInputs;
            delete parseOptions.expectedOutputs;
            parseSession = await aiAPI.create(parseOptions);
          }
          isTempSession = true;
        }

        const analysisResult = await parseSession.prompt(`請分析這句話並提取專案與任務進度資料：「${textToProcess}」`);
        const data = safeExtractJSON(analysisResult);
        if (data.isAction) {
          if (data.intentType === 'project') {
            await handleProjectActionUpdate({
              actionType: data.actionType as 'create' | 'update',
              projectName: data.targetName,
              progressPercent: data.progressPercent,
              statusSummary: data.statusSummary
            });
            isProjectActionProcessed = true;
          } else if (data.intentType === 'daily_mission') {
            await handleDailyMissionActionUpdate({
              actionType: data.actionType as 'create' | 'complete' | 'delete',
              targetName: data.targetName,
              estimatedPomodoros: data.estimatedPomodoros,
              statusSummary: data.statusSummary
            });
            isProjectActionProcessed = true;
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
          const createOptions: any = {
            systemPrompt: `你是一個專業的 Scrum 敏捷開發與番茄鐘助理。
你會幫助使用者評估任務優先順序、拆解子任務、估算番茄鐘數量，並給予專注力與效率建議。
請使用「繁體中文」進行回答，回答要簡短、俐落、精準且富有鼓勵語氣。`,
            expectedInputs: [{ type: 'text', languages: ['zh', 'en'] }],
            expectedOutputs: [{ type: 'text', languages: ['zh'] }]
          };
          try {
            aiSessionRef.current = await aiAPI.create(createOptions);
          } catch (e) {
            delete createOptions.expectedInputs;
            delete createOptions.expectedOutputs;
            aiSessionRef.current = await aiAPI.create(createOptions);
          }
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
