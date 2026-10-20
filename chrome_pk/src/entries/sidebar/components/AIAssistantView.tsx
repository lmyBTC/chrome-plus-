import React, { useState, useEffect, useRef } from 'react';
import { parseMarkdown } from '../../../utils/markdown';
import { parseTasksFromText } from '../../../utils/task-parser';
import { StorageQueue } from '../../../core/chrome/storageQueue';
import { useAISession, Message } from '../hooks/useAISession';
import { useContextMenuSync } from '../hooks/useContextMenuSync';
import { useTimerSync } from '../hooks/useTimerSync';

export const AIAssistantView: React.FC = () => {
  const storageQueueRef = useRef(new StorageQueue());
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle');
  const [historyConversations, setHistoryConversations] = useState<any[]>([]);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);

  // 1. 呼叫 AI Hook (按需初始化)
  const {
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
    const prompt = `這是我在網頁「${title}」(${url}) 上選取的文字：\n"${text}"\n\n請幫我分析這段內容，並將其拆解為具體的 Scrum 任務與番茄鐘規劃。`;
    
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
              prompt += `我選取的文字內容是：\n"${selectedText}"\n`;
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

  // 8. 狀態渲染：初始化中
  if (isInitializing) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 bg-[#0b0f19] text-slate-300 p-6">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-medium tracking-wide">正在初始化 PK+ AI 助理...</p>
        <p className="text-xs text-slate-500 mt-2">載入 Gemini Nano 本地模型中</p>
      </div>
    );
  }

  // 9. 狀態渲染：本地 AI 未就緒
  if (aiAvailable === 'no') {
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

  // 10. 正常對話介面
  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-[#0b0f19] text-slate-300">
      {/* 助理小頂部控制列 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-[#0f172a]/60 backdrop-blur-sm">
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
            placeholder="詢問關於任務的規劃與建議..."
            className="flex-1 bg-transparent border-none text-sm text-slate-200 placeholder-slate-500 focus:outline-none pl-2.5 py-1"
            disabled={isSending || aiAvailable !== 'yes'}
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputText.trim() || isSending || aiAvailable !== 'yes'}
            className={`p-2 rounded-lg transition-all ${
              inputText.trim() && !isSending && aiAvailable === 'yes'
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
    </div>
  );
};
