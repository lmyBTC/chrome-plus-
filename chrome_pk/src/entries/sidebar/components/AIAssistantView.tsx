import React, { useState, useEffect, useRef, useCallback } from 'react';
import { parseMarkdown } from '../../../utils/markdown';
import { parseTasksFromText } from '../../../utils/task-parser';
import { StorageQueue } from '../../../core/chrome/storageQueue';
import { useAISession, Message, AIMode } from '../hooks/useAISession';
import { useContextMenuSync } from '../hooks/useContextMenuSync';
import { useTimerSync } from '../hooks/useTimerSync';
import { StoredGeminiConversation } from '../../../core/ai/OfficialGeminiConnector';

// 主 Tab 類型
type MainTab = 'assistant' | 'official_sync';

export const AIAssistantView: React.FC = () => {
  const storageQueueRef = useRef(new StorageQueue());
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle');
  const [historyConversations, setHistoryConversations] = useState<any[]>([]);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);

  // Phase 2 新增狀態
  const [activeTab, setActiveTab] = useState<MainTab>('assistant');
  const [officialConversations, setOfficialConversations] = useState<StoredGeminiConversation[]>([]);
  const [injectStatus, setInjectStatus] = useState<Record<string, 'idle' | 'injecting' | 'success' | 'error'>>({});
  const [gtdStatus, setGtdStatus] = useState<Record<string, 'idle' | 'saving' | 'success' | 'error'>>({});

  // 1. 呼叫 AI Hook (按需初始化)
  const {
    messages,
    setMessages,
    inputText,
    setInputText,
    aiAvailable,
    aiMode,
    setAiMode,
    injectToOfficial,
    isInitializing,
    isSending,
    setIsSending,
    handleSend,
    aiSessionRef,
    checkAndInitAI,
    pendingConfirm,
    handleConfirmAction,
    handleCancelAction
  } = useAISession(storageQueueRef.current);

  // 2. 呼叫 Timer Hook，帶入敏捷檢討觸發
  useTimerSync(() => {
    setMessages(prev => {
      const last = prev[prev.length - 1];
      if (last && last.role === 'model' && last.content.includes('恭喜完成一粒番茄鐘')) {
        return prev;
      }
      return [
        ...prev,
        {
          role: 'model',
          content: `🎉 恭喜完成一粒番茄鐘！\n在執行過程中有遇到任何阻礙 (Blockers) 或新的啟發嗎？需要我幫你整理回顧成果並記錄嗎？`
        }
      ];
    });
  });

  // 3. 呼叫 Context Menu Hook，帶入 Pending Text 處理
  useContextMenuSync(async (pendingData) => {
    if (Date.now() - pendingData.timestamp > 10000) {
      chrome.storage.local.remove('pendingAnalyzeText');
      return;
    }

    chrome.storage.local.remove('pendingAnalyzeText');
    const { text, title, url } = pendingData;
    const prompt = `這是我在網頁「${title}」(${url}) 上選取的文字：\n\"${text}\"\n\n請幫我分析這段內容，並將其拆解為具體的 Scrum 任務與番茄鐘規劃。`;
    
    setMessages(prev => [...prev, { role: 'user', content: `📥 匯入右鍵選取內容：「${text.slice(0, 30)}...」` }]);
    handleSend(prompt);
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 4. 讀取歷史對話
  const loadHistoryConversations = async () => {
    const result = await chrome.storage.local.get('geminiConversations');
    setHistoryConversations(result.geminiConversations || []);
  };

  // 5. 載入歷史官方對話
  const handleSelectHistory = (conv: any) => {
    if (!conv || !conv.messages) return;
    const formatted: Message[] = conv.messages.map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      content: m.content
    }));

    setMessages([
      {
        role: 'system',
        content: `📂 已載入歷史對話：「${conv.title || '無標題'}」`
      },
      ...formatted
    ]);
    setShowHistoryDropdown(false);
  };

  // 6. 一鍵寫入今日核心戰役至 storage
  const handleAddToDailyMissions = async (msgContent: string) => {
    const parsedTasks = parseTasksFromText(msgContent);
    if (parsedTasks.length === 0) {
      alert('⚠️ 未能從助理的回覆中解析出符合格式的任務項目。\n\n請確保回覆中含有 🍅 數量的清單（例如：「- 實作登入頁面 (2 🍅)」）。');
      return;
    }

    try {
      await storageQueueRef.current.enqueue(async () => {
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

        const existingBattles = dailyLogs[today].coreBattles || [];
        let updatedMissions = [...weeklyMissions];
        let updatedBattles = [...existingBattles];
        let addedCount = 0;

        for (let i = 0; i < parsedTasks.length; i++) {
          const task = parsedTasks[i];
          let mission = updatedMissions.find((m: any) => m.text.trim().toLowerCase() === task.title.trim().toLowerCase());
          let missionId = '';
          
          if (!mission) {
            missionId = 'mission-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
            const newMission = {
              id: missionId,
              text: task.title,
              isCompleted: false,
              createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
              priority: 'P2' as const
            };
            updatedMissions.push(newMission);
          } else {
            missionId = mission.id;
          }

          if (!updatedBattles.some((b: any) => b.missionId === missionId)) {
            updatedBattles.push({
              missionId: missionId,
              committedTime: '09:00-10:00'
            });
            addedCount++;
          }
        }

        if (addedCount === 0) {
          alert('ℹ️ 任務已存在於今日儀表板中，未重複新增。');
          return;
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
            role: 'system', 
            content: `✅ 已成功將 ${addedCount} 個 AI 拆解的任務匯入儀表板！` 
          }
        ]);
      });
    } catch (e) {
      console.error('寫入今日任務失敗:', e);
      alert('❌ 寫入儀表板任務失敗。');
    }
  };

  // 7. 一鍵匯入任務處理
  const handleImportTasks = async () => {
    if (importStatus === 'importing') return;
    setImportStatus('importing');

    try {
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        const activeTab = tabs[0];
        if (!activeTab?.id) {
          setImportStatus('error');
          return;
        }

        if (activeTab.url?.startsWith('chrome://') || activeTab.url?.startsWith('chrome-extension://')) {
          const result = await chrome.storage.local.get(['dailyLogs', 'weeklyMissions']);
          const dailyLogs = result.dailyLogs || {};
          const weeklyMissions = result.weeklyMissions || [];
          const today = new Date().toISOString().split('T')[0];
          const todayLog = dailyLogs[today];

          if (todayLog && todayLog.coreBattles && todayLog.coreBattles.length > 0) {
            const taskStr = todayLog.coreBattles
              .map((b: any, index: number) => {
                const mission = weeklyMissions.find((m: any) => m.id === b.missionId);
                const title = mission ? mission.text : '未知任務';
                const statusText = mission?.isCompleted ? '已完成' : '進行中';
                return `${index + 1}. [${statusText}] ${title}`;
              })
              .join('\n');
            
            const prompt = `這是我目前在 Power Kit 儀表板中規劃的今日核心戰役任務清單：\n\n${taskStr}\n\n請幫我評估任務優先順序，並給予今日的衝刺番茄鐘執行與時間分配建議。`;
            setInputText('');
            setMessages(prev => [...prev, { role: 'user', content: '🍅 正在匯入我今天的 Power Kit 核心戰役任務...' }]);
            setIsSending(true);
            
            try {
              const response = await aiSessionRef.current.prompt(prompt);
              setMessages(prev => [...prev, { role: 'model', content: response }]);
              setImportStatus('success');
            } catch (err) {
              setMessages(prev => [...prev, { role: 'system', content: '❌ 處理任務分析時發生錯誤。' }]);
              setImportStatus('error');
            } finally {
              setIsSending(false);
            }
          } else {
            setMessages(prev => [...prev, { role: 'system', content: 'ℹ️ 儀表板中目前沒有規劃任務。請先建立任務後再行匯入。' }]);
            setImportStatus('success');
          }
          return;
        }

        chrome.tabs.sendMessage(activeTab.id, { action: 'GET_CURRENT_TASKS' }, async (response) => {
          if (chrome.runtime.lastError) {
            console.warn('無法連動網頁 Content Script:', chrome.runtime.lastError);
            setMessages(prev => [...prev, { role: 'system', content: '⚠️ 無法從當前網頁擷取資料。請確認網頁已載入完成，且非 Chrome 系統頁面。' }]);
            setImportStatus('error');
            return;
          }

          if (response) {
            const { title, selectedText, url } = response;
            let prompt = `這是我在網頁「${title}」(${url}) 上的參考資訊：\n`;
            if (selectedText) {
              prompt += `我選取的文字內容是：\n\"${selectedText}\"\n`;
              prompt += `請幫我將這段內容轉換、拆解為具體的 Power Kit 任務清單，並預估所需的番茄鐘數量。`;
            } else {
              prompt += `網頁標題是：${title}\n`;
              prompt += `請針對此網頁，分析其主題，並提議 2-3 個相關的學習或開發任務與番茄鐘規劃。`;
            }

            setInputText('');
            setMessages(prev => [...prev, { role: 'user', content: selectedText ? `🍅 匯入我選取的網頁文字：「${selectedText.slice(0, 30)}...」` : `🍅 匯入當前網頁：「${title}」` }]);
            setIsSending(true);

            try {
              const aiResp = await aiSessionRef.current.prompt(prompt);
              setMessages(prev => [...prev, { role: 'model', content: aiResp }]);
              setImportStatus('success');
            } catch (err) {
              setMessages(prev => [...prev, { role: 'system', content: '❌ 處理網頁任務分析時發生錯誤。' }]);
              setImportStatus('error');
            } finally {
              setIsSending(false);
            }
          } else {
            setImportStatus('error');
          }
        });
      });
    } catch (e) {
      console.error('匯入任務失敗:', e);
      setImportStatus('error');
    } finally {
      setTimeout(() => setImportStatus('idle'), 2000);
    }
  };

  // ==========================================
  // Phase 2 新增：官方側欄同步功能
  // ==========================================

  // P2-1: 載入官方對話池（即時監聽 storage 變化）
  useEffect(() => {
    const loadOfficialConversations = async () => {
      const result = await chrome.storage.local.get('geminiConversations');
      setOfficialConversations(result.geminiConversations || []);
    };

    loadOfficialConversations();

    // 監聽 storage 變化即時刷新
    const onStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area === 'local' && changes['geminiConversations']) {
        setOfficialConversations(changes['geminiConversations'].newValue || []);
      }
    };
    chrome.storage.onChanged.addListener(onStorageChange);
    return () => chrome.storage.onChanged.removeListener(onStorageChange);
  }, []);

  // P2-2: ⚡ 一鍵轉為衝刺任務（從官方對話卡片）
  const handleConvertToSprint = async (conv: StoredGeminiConversation) => {
    const fullText = conv.messages.map(m => m.content).join('\n');
    const parsedTasks = parseTasksFromText(fullText);
    
    if (parsedTasks.length === 0) {
      // 無法自動解析，將對話摘要加入戰役
      try {
        await storageQueueRef.current.enqueue(async () => {
          const result = await chrome.storage.local.get('weeklyMissions');
          const missions = result.weeklyMissions || [];
          const title = conv.title || conv.messages[0]?.content?.slice(0, 40) || '官方 Gemini 對話';
          const newMission = {
            id: 'mission-' + Date.now(),
            text: `[Gemini] ${title}`,
            isCompleted: false,
            createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
            priority: 'P2' as const,
            notes: `來源：${conv.source || 'gemini.google.com'}`
          };
          missions.push(newMission);
          await chrome.storage.local.set({ weeklyMissions: missions });
        });
        alert(`✅ 已將對話「${conv.title}」建立為衝刺任務！`);
      } catch (e) {
        alert('❌ 建立衝刺任務失敗');
      }
      return;
    }

    await handleAddToDailyMissions(fullText);
    alert(`✅ 已從官方對話解析出 ${parsedTasks.length} 個任務並寫入今日戰役！`);
  };

  // P2-3: 📥 加入 GTD 待辦收件匣
  const handleAddToGTD = async (conv: StoredGeminiConversation) => {
    const convId = conv.id;
    setGtdStatus(prev => ({ ...prev, [convId]: 'saving' }));

    try {
      await storageQueueRef.current.enqueue(async () => {
        const result = await chrome.storage.local.get('gtdInbox');
        const inbox: any[] = result.gtdInbox || [];
        const title = conv.title || conv.messages[0]?.content?.slice(0, 50) || '官方 Gemini 對話';
        
        inbox.push({
          id: 'gtd-' + Date.now(),
          text: `[Gemini] ${title}`,
          source: conv.source || 'gemini.google.com',
          timestamp: Date.now(),
          rawContent: conv.messages.map(m => `[${m.role}]: ${m.content}`).join('\n---\n')
        });
        await chrome.storage.local.set({ gtdInbox: inbox });
      });
      setGtdStatus(prev => ({ ...prev, [convId]: 'success' }));
      setTimeout(() => setGtdStatus(prev => ({ ...prev, [convId]: 'idle' })), 2000);
    } catch (e) {
      console.error('加入 GTD 失敗:', e);
      setGtdStatus(prev => ({ ...prev, [convId]: 'error' }));
      setTimeout(() => setGtdStatus(prev => ({ ...prev, [convId]: 'idle' })), 2000);
    }
  };

  // P2-4: 🔄 回拋至官方 Gemini 輸入框
  const handleInjectToOfficial = async (conv: StoredGeminiConversation) => {
    const convId = conv.id;
    setInjectStatus(prev => ({ ...prev, [convId]: 'injecting' }));

    const lastUserMsg = [...conv.messages].reverse().find(m => m.role === 'user');
    const text = lastUserMsg?.content || conv.title || '請繼續上一個對話';

    try {
      const result = await injectToOfficial(text, true);
      if (result?.success) {
        setInjectStatus(prev => ({ ...prev, [convId]: 'success' }));
      } else {
        setInjectStatus(prev => ({ ...prev, [convId]: 'error' }));
      }
    } catch (e) {
      console.error('回拋失敗:', e);
      setInjectStatus(prev => ({ ...prev, [convId]: 'error' }));
    } finally {
      setTimeout(() => setInjectStatus(prev => ({ ...prev, [convId]: 'idle' })), 2500);
    }
  };

  // P2-5: 模型切換（三態循環：local_nano → gemini_cloud → official_bridge → local_nano）
  const handleToggleAIMode = useCallback(() => {
    const nextMode: AIMode =
      aiMode === 'local_nano'
        ? 'gemini_cloud'
        : aiMode === 'gemini_cloud'
        ? 'official_bridge'
        : 'local_nano';
    setAiMode(nextMode);
    setMessages(prev => [
      ...prev,
      {
        role: 'system',
        content:
          nextMode === 'local_nano'
            ? '🔄 已切換至本機 Gemini Nano 模式。'
            : nextMode === 'gemini_cloud'
            ? '🔄 已切換至雲端 Gemini 模式（支援 Function Calling 操控看板）。'
            : '🔄 已切換至官方 Gemini 橋接模式（回拋至右側官方側欄）。'
      }
    ]);
  }, [aiMode, setAiMode, setMessages]);

  // ==========================================
  // 渲染輔助：官方對話卡片
  // ==========================================
  const renderOfficialConversationCard = (conv: StoredGeminiConversation) => {
    const convId = conv.id;
    const lastMsg = conv.messages[conv.messages.length - 1];
    const preview = lastMsg?.content?.slice(0, 120) || '（無內容）';
    const timeStr = conv.timestamp ? new Date(conv.timestamp).toLocaleString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
    const sourceLabel = conv.source === 'workspace' ? '📋 Workspace' : conv.source === 'gemini_web' ? '🌐 Gemini Web' : '🤖 Gemini';

    return (
      <div key={convId} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 mb-3 hover:border-indigo-700/40 transition-all">
        {/* 卡片頭部 */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-bold text-slate-200 truncate pr-2">{conv.title || '無標題對話'}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-indigo-400 font-medium">{sourceLabel}</span>
              {conv.modelName && <span className="text-[10px] text-slate-500">{conv.modelName}</span>}
              <span className="text-[10px] text-slate-600">{timeStr}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded-md">{conv.messages.length} 則</span>
          </div>
        </div>

        {/* 對話預覽 */}
        <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2 mb-3">{preview}</p>

        {/* 引用分頁標籤 */}
        {conv.referencedTabs && conv.referencedTabs.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {conv.referencedTabs.map((tab, i) => (
              <span key={i} className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-md truncate max-w-[100px]" title={tab.url}>
                🔗 {tab.title}
              </span>
            ))}
          </div>
        )}

        {/* 操作按鈕列 */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* ⚡ 一鍵轉衝刺任務 */}
          <button
            onClick={() => handleConvertToSprint(conv)}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold bg-amber-950/60 hover:bg-amber-900/80 border border-amber-800/40 hover:border-amber-600/60 text-amber-300 rounded-lg transition-all active:scale-95"
          >
            ⚡ 轉衝刺任務
          </button>

          {/* 📥 加入 GTD */}
          <button
            onClick={() => handleAddToGTD(conv)}
            disabled={gtdStatus[convId] === 'saving'}
            className={`flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-lg transition-all active:scale-95 border ${
              gtdStatus[convId] === 'success'
                ? 'bg-emerald-950/60 border-emerald-800/40 text-emerald-300'
                : gtdStatus[convId] === 'error'
                ? 'bg-red-950/60 border-red-800/40 text-red-300'
                : 'bg-teal-950/60 hover:bg-teal-900/80 border-teal-800/40 hover:border-teal-600/60 text-teal-300'
            }`}
          >
            {gtdStatus[convId] === 'saving' ? '儲存中...' : gtdStatus[convId] === 'success' ? '✅ 已加入' : gtdStatus[convId] === 'error' ? '❌ 失敗' : '📥 加入 GTD'}
          </button>

          {/* 🔄 回拋官方側欄 */}
          <button
            onClick={() => handleInjectToOfficial(conv)}
            disabled={injectStatus[convId] === 'injecting'}
            className={`flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-lg transition-all active:scale-95 border ${
              injectStatus[convId] === 'success'
                ? 'bg-emerald-950/60 border-emerald-800/40 text-emerald-300'
                : injectStatus[convId] === 'error'
                ? 'bg-red-950/60 border-red-800/40 text-red-300'
                : 'bg-indigo-950/60 hover:bg-indigo-900/80 border-indigo-800/40 hover:border-indigo-600/60 text-indigo-300'
            }`}
          >
            {injectStatus[convId] === 'injecting' ? '注入中...' : injectStatus[convId] === 'success' ? '✅ 已回拋' : injectStatus[convId] === 'error' ? '❌ 失敗' : '🔄 回拋官方側欄'}
          </button>
        </div>
      </div>
    );
  };

  // ==========================================
  // 8. 狀態渲染：初始化中
  // ==========================================
  if (isInitializing) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 bg-[#0b0f19] text-slate-300 p-6">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-medium tracking-wide">正在初始化 PK+ AI 助理...</p>
        <p className="text-xs text-slate-500 mt-2">載入 Gemini Nano 本地模型中</p>
      </div>
    );
  }

  // 9. 狀態渲染：本地 AI 未就緒 (僅在 local_nano 模式阻擋)
  if (aiAvailable === 'no' && aiMode === 'local_nano') {
    return (
      <div className="flex flex-col flex-1 bg-[#0b0f19] text-slate-300 p-6 overflow-y-auto">
        <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-3">
          <span className="text-2xl">🤖</span>
          <h2 className="text-lg font-bold text-white tracking-wide">PK+ 助理</h2>
        </div>
        
        <div className="bg-red-950/40 border border-red-800/60 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 text-red-400 font-bold mb-3 text-sm">
            <span>⚠️</span> 瀏覽器尚未啟用內建 AI 功能
          </div>
          <p className="text-xs text-red-200/80 leading-relaxed mb-4">
            PK+ 助理使用最新的 Chrome 內建 Gemini Nano 模型，完全在本地端運行，不需要 API 金鑰。要啟用此功能，請完成以下設定：
          </p>

          <ol className="list-decimal pl-4 space-y-3 text-xs text-slate-300">
            <li>
              <strong>開啟優化引導旗標：</strong>
              <br />
              在網址列輸入 <code className="bg-slate-950 px-1 py-0.5 rounded text-indigo-300 select-all font-mono">chrome://flags/#optimization-guide-on-device-model</code>，設定為 <span className="text-indigo-400 font-semibold">Enabled BypassPrefRequirement</span>。
            </li>
            <li>
              <strong>開啟 Prompt API：</strong>
              <br />
              輸入 <code className="bg-slate-950 px-1 py-0.5 rounded text-indigo-300 select-all font-mono">chrome://flags/#prompt-api-for-gemini-nano</code>，設定為 <span className="text-indigo-400 font-semibold">Enabled</span>。
            </li>
            <li>
              <strong>下載模型組件：</strong>
              <br />
              輸入 <code className="bg-slate-950 px-1 py-0.5 rounded text-indigo-300 select-all font-mono">chrome://components</code>，找到 <span className="font-semibold text-white">Optimization Guide On Device Model</span>，點選「檢查更新」，並等待下載進度顯示為「最新狀態 (已下載)」。
            </li>
            <li>
              <strong>重新啟動瀏覽器：</strong>
              <br />
              重啟 Chrome 後，點擊右上角插件圖示再次開啟此側欄。
            </li>
          </ol>
        </div>

        <button 
          onClick={checkAndInitAI}
          className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold rounded-xl shadow-lg shadow-indigo-950/40 transition-all text-xs"
        >
          🔄 重新偵測與初始化
        </button>
        <button 
          onClick={handleToggleAIMode}
          className="w-full mt-2 py-2 px-4 bg-amber-950/50 hover:bg-amber-900/70 border border-amber-700/50 text-amber-300 font-semibold rounded-xl text-xs transition-colors"
        >
          ☁️ 切換至雲端 Gemini 模式 (需 API Key)
        </button>

        <details className="mt-4 bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 text-xs">
          <summary className="font-semibold text-slate-300 cursor-pointer hover:text-white transition-colors flex items-center gap-1 select-none">
            🛠️ 開發者 Console 排錯說明
          </summary>
          <div className="mt-2.5 text-[11px] text-slate-400 leading-relaxed">
            <p className="mb-2">
              按 <code className="bg-slate-950 px-1 py-0.5 rounded text-slate-300 font-mono">F12</code> 或右鍵「檢查」開啟主控台 (Console)，可檢查是否有 API 阻擋或模型未就緒之錯誤。
            </p>
          </div>
        </details>
      </div>
    );
  }

  // ==========================================
  // 10. 正常對話介面（含 Phase 2 雙軌 Tab）
  // ==========================================
  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-[#0b0f19] text-slate-300">

      {/* ── 頂部雙軌 Tab + 模型切換按鈕 ── */}
      <div className="flex items-center px-3 pt-2 pb-0 border-b border-slate-800 bg-[#0f172a]/60 backdrop-blur-sm gap-2">
        {/* Tab 切換 */}
        <div className="flex items-center gap-1 flex-1">
          <button
            onClick={() => setActiveTab('assistant')}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-t-lg border-b-2 transition-all ${
              activeTab === 'assistant'
                ? 'border-indigo-500 text-white bg-indigo-950/40'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            💬 PK+ 助理
          </button>
          <button
            onClick={() => setActiveTab('official_sync')}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-t-lg border-b-2 transition-all ${
              activeTab === 'official_sync'
                ? 'border-teal-500 text-white bg-teal-950/40'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            🌐 官方側欄同步
            {officialConversations.length > 0 && (
              <span className="ml-1 bg-teal-700 text-teal-100 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                {officialConversations.length}
              </span>
            )}
          </button>
        </div>

        {/* 模型切換按鈕 (三態循環：Nano ➔ Cloud ➔ Official) */}
        <button
          onClick={handleToggleAIMode}
          title={
            aiMode === 'local_nano'
              ? '目前：本機 Nano｜點擊切換至雲端 Gemini'
              : aiMode === 'gemini_cloud'
              ? '目前：雲端 Gemini｜點擊切換至官方橋接'
              : '目前：官方橋接｜點擊切換至本機 Nano'
          }
          className={`flex items-center gap-1 px-2.5 py-1 mb-0.5 text-[10px] font-semibold rounded-lg border transition-all active:scale-95 ${
            aiMode === 'local_nano'
              ? 'bg-violet-950/60 border-violet-700/50 text-violet-300 hover:bg-violet-900/70'
              : aiMode === 'gemini_cloud'
              ? 'bg-amber-950/60 border-amber-700/50 text-amber-300 hover:bg-amber-900/70'
              : 'bg-teal-950/60 border-teal-700/50 text-teal-300 hover:bg-teal-900/70'
          }`}
        >
          {aiMode === 'local_nano' ? '🧠 Nano' : aiMode === 'gemini_cloud' ? '☁️ Cloud' : '🌐 官方'}
          <span className="opacity-50">⇄</span>
        </button>
      </div>

      {/* ── 分頁內容 ── */}
      {activeTab === 'assistant' ? (
        /* ─── PK+ 助理分頁 ─── */
        <>
          {/* 助理小頂部控制列 */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800/60 bg-[#0f172a]/30">
            <div className="relative">
              <div 
                className="flex items-center gap-1.5 cursor-pointer py-1 px-1.5 rounded-lg hover:bg-slate-800/60 transition-colors"
                onClick={() => {
                  if (!showHistoryDropdown) {
                    loadHistoryConversations();
                  }
                  setShowHistoryDropdown(!showHistoryDropdown);
                }}
              >
                <span className="text-xs text-slate-400 font-medium hover:text-white flex items-center gap-1">
                  📂 歷史官方對話 <span className="text-[9px]">▼</span>
                </span>
              </div>

              {/* 歷史對話下拉清單 */}
              {showHistoryDropdown && (
                <div className="absolute left-0 mt-1.5 w-60 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-30 max-h-64 overflow-y-auto">
                  <div className="p-2 border-b border-slate-800 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    📂 選擇載入對話
                  </div>
                  {historyConversations.length === 0 ? (
                    <div className="p-3 text-xs text-slate-500 italic">無歷史對話紀錄</div>
                  ) : (
                    historyConversations.map((conv, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectHistory(conv)}
                        className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-all truncate"
                      >
                        💬 {conv.title || '無標題對話'}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* 右側一鍵匯入按鈕 */}
            <button
              onClick={handleImportTasks}
              disabled={importStatus === 'importing'}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                importStatus === 'importing'
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : importStatus === 'success'
                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                  : importStatus === 'error'
                  ? 'bg-red-950/60 text-red-400 border border-red-800/40'
                  : 'bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-800/40 hover:scale-[1.02]'
              }`}
            >
              <span>🍅</span>
              <span>{importStatus === 'importing' ? '分析中...' : importStatus === 'success' ? '匯入成功' : importStatus === 'error' ? '匯入失敗' : '一鍵匯入任務'}</span>
            </button>
          </div>

          {/* 聊天訊息區 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
            {messages.map((msg, index) => {
              if (msg.role === 'system') {
                return (
                  <div key={index} className="text-center text-xs text-slate-500 italic py-1 bg-slate-900/40 border border-slate-850/60 rounded-xl my-2">
                    {msg.content}
                  </div>
                );
              }

              if (msg.role === 'action_report') {
                return (
                  <div key={index} className="flex flex-col max-w-[90%] mr-auto items-start my-1.5">
                    <span className="text-[10px] text-teal-400 mb-1 px-1 font-semibold flex items-center gap-1">
                      <span>⚡</span> 看板指令報告 {msg.actionName && <code className="bg-slate-800/80 text-teal-300 px-1.5 py-0.5 rounded font-mono text-[9px]">{msg.actionName}</code>}
                    </span>
                    <div
                      className={`w-full p-3 rounded-2xl rounded-tl-none text-xs leading-relaxed shadow-md border ${
                        msg.success !== false
                          ? 'bg-slate-900/90 border-teal-800/60 text-slate-200'
                          : 'bg-rose-950/40 border-rose-800/60 text-rose-200'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-base select-none">{msg.success !== false ? '✅' : '❌'}</span>
                        <div className="flex-1 whitespace-pre-wrap">{msg.content}</div>
                      </div>

                      {/* WIP 限制警告橫幅 */}
                      {msg.warning && (
                        <div className="mt-2.5 p-2.5 rounded-xl bg-amber-950/70 border border-amber-600/60 text-amber-200 text-[11px] flex items-start gap-2 shadow-sm">
                          <span className="text-amber-400 text-sm select-none">⚠️</span>
                          <div className="flex-1 leading-snug">
                            <span className="font-bold text-amber-300 block mb-0.5">WIP 守門限制警示</span>
                            <span className="text-amber-200/90">{msg.warning}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              const isUser = msg.role === 'user';
              return (
                <div
                  key={index}
                  className={`flex flex-col max-w-[85%] ${isUser ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                >
                  <span className="text-[10px] text-slate-500 mb-1 px-1">
                    {isUser ? '👤 你' : '🤖 助理'}
                  </span>
                  <div
                    className={`p-3 rounded-2xl text-sm leading-relaxed shadow-md ${
                      isUser
                        ? 'bg-indigo-600 text-white rounded-tr-none'
                        : 'bg-slate-900/80 border border-slate-800 text-slate-200 rounded-tl-none'
                    }`}
                  >
                    {isUser ? <p className="whitespace-pre-wrap">{msg.content}</p> : parseMarkdown(msg.content)}
                    
                    {/* 🔄 逆向整合：一鍵寫入今日戰役按鈕 */}
                    {!isUser && index > 0 && (msg.content.includes('🍅') || msg.content.includes('-') || msg.content.includes('*')) && (
                      <button
                        onClick={() => handleAddToDailyMissions(msg.content)}
                        className="mt-2 text-xs flex items-center gap-1 bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-850/60 hover:border-indigo-700/60 text-indigo-300 px-2 py-1 rounded-lg active:scale-95 transition-all font-semibold shadow-sm"
                      >
                        <span>➕</span> 寫入今日戰役儀表板
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {isSending && (
              <div className="flex flex-col items-start max-w-[85%] mr-auto">
                <span className="text-[10px] text-slate-500 mb-1 px-1">🤖 助理</span>
                <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl rounded-tl-none flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* 輸入區 */}
          <div className="p-3 border-t border-slate-800 bg-[#0b0f19] sticky bottom-0">
            <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-850 rounded-xl p-1.5 focus-within:border-indigo-500/50 transition-all">
              <input
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleSend();
                  }
                }}
                placeholder={aiMode === 'official_bridge' ? '輸入指令，將回拋至官方 Gemini 側欄...' : '詢問關於任務的規劃與建議...'}
                className="flex-1 bg-transparent border-none text-sm text-slate-200 placeholder-slate-500 focus:outline-none pl-2.5 py-1"
                disabled={isSending}
              />
              <button
                onClick={() => handleSend()}
                disabled={!inputText.trim() || isSending}
                className={`p-2 rounded-lg transition-all ${
                  inputText.trim() && !isSending
                    ? 'bg-indigo-600 text-white hover:bg-indigo-500 hover:scale-105 active:scale-95'
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M3.105 2.289a.75.75 0 0 0-.826.95l1.414 4.925A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.896 28.896 0 0 0 15.293-7.154.75.75 0 0 0 0-1.115A28.897 28.897 0 0 0 3.105 2.289Z" />
                </svg>
              </button>
            </div>
          </div>
        </>
      ) : (
        /* ─── 官方側欄同步分頁 ─── */
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* 分頁標頭 */}
          <div className="px-4 py-2 border-b border-slate-800/60 bg-[#0f172a]/30 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-teal-300">🌐 官方 Gemini 對話同步</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">即時顯示右側官方 Gemini 側欄對話，可一鍵轉為任務或回拋</p>
            </div>
            <button
              onClick={async () => {
                const result = await chrome.storage.local.get('geminiConversations');
                setOfficialConversations(result.geminiConversations || []);
              }}
              className="text-[10px] text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800 transition-all"
            >
              🔄 刷新
            </button>
          </div>

          {/* 對話卡片列表 */}
          <div className="flex-1 overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-slate-800">
            {officialConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <div className="text-4xl mb-4 opacity-30">🌐</div>
                <p className="text-sm font-semibold text-slate-400 mb-2">尚無官方 Gemini 對話</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  請開啟右側 Google Workspace Ask Gemini 側欄或前往{' '}
                  <span className="text-teal-400 font-mono">gemini.google.com</span>{' '}
                  進行對話，同步後將自動顯示於此。
                </p>
              </div>
            ) : (
              officialConversations.slice().reverse().map(conv => renderOfficialConversationCard(conv))
            )}
          </div>
        </div>
      )}

      {/* 任務 5.2: 破壞性操作確認 Modal */}
      {pendingConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-amber-500/50 rounded-2xl p-4 shadow-2xl flex flex-col gap-3">
            <div className="flex items-center gap-2 text-amber-400">
              <span className="text-lg">⚠️</span>
              <h3 className="font-bold text-sm text-slate-100">破壞性操作確認請求</h3>
            </div>
            <div className="text-xs text-slate-300 leading-relaxed bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <p className="font-semibold text-amber-200/90 mb-1">
                AI 嘗試執行：<code className="text-amber-300 font-mono bg-slate-900 px-1 py-0.5 rounded">{pendingConfirm.call.name}</code>
              </p>
              <p>{pendingConfirm.details || pendingConfirm.message}</p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleCancelAction}
                disabled={isSending}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={isSending}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-950/50 transition-all active:scale-95 flex items-center gap-1.5"
              >
                {isSending ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>執行中...</span>
                  </>
                ) : (
                  <>
                    <span>✓</span>
                    <span>確認執行</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
