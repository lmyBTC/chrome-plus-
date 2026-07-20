import React, { useState, useEffect, useRef } from 'react';
import { storage } from '../../../core/chrome/storage';
import { getAICore, checkAiCapabilities } from '../../../utils/ai-helper';

interface AISidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
}

export const AISidebar: React.FC<AISidebarProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [clipboardText, setClipboardText] = useState('');
  const [pageContext, setPageContext] = useState('');
  const [pageTitle, setPageTitle] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [aiAvailable, setAiAvailable] = useState<'checking' | 'yes' | 'no'>('checking');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const aiSessionRef = useRef<any>(null);

  // 滾動到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    checkAndInitAI();

    return () => {
      if (aiSessionRef.current) {
        try {
          aiSessionRef.current.destroy();
        } catch (e) {
          console.error('銷毀 AI 會話失敗:', e);
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
        return;
      }

      setAiAvailable('yes');
    } catch (error) {
      console.error('檢測本地 AI 失敗:', error);
      setAiAvailable('no');
    }
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      fetchContexts();
    }
  }, [messages, isOpen]);

  // 嘗試讀取剪貼簿與當前網頁內容
  const fetchContexts = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim().length > 0) {
        setClipboardText(text.trim());
      }
    } catch (e) {
      console.log('無法直接讀取剪貼簿，將使用手動貼上');
    }

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id && tab.url && !tab.url.startsWith('chrome://')) {
        setPageTitle(tab.title || '');
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            const selection = window.getSelection()?.toString() || '';
            if (selection) return selection;
            const text = document.body.innerText || '';
            return text.substring(0, 500); // 避免超過 Token 限制
          }
        });
        if (results && results[0] && results[0].result) {
          setPageContext(results[0].result);
        } else {
          setPageContext('');
        }
      }
    } catch (e) {
      console.log('無法擷取網頁內容:', e);
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputValue;
    if (!textToSend.trim() || isLoading) return;

    setErrorMsg('');
    const userMsg: Message = {
      role: 'user',
      content: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customPrompt) setInputValue('');
    setIsLoading(true);

    if (aiAvailable !== 'yes') {
      setErrorMsg('本地 Gemini Nano AI 尚未啟用。請依照上方說明在 chrome://flags 中啟用它。');
      setIsLoading(false);
      return;
    }

    try {
      const aiAPI = getAICore();
      if (!aiAPI) {
        setErrorMsg('無法取得本地 AI API 呼叫路徑。');
        setIsLoading(false);
        return;
      }
      if (!aiSessionRef.current) {
        aiSessionRef.current = await aiAPI.create({
          systemPrompt: "你是一個專案助理，主要協助專案管理、工作進度更新與任務拆解。請用繁體中文回答，排版請清晰乾淨，多用 Markdown 的標題、清單與粗體來增強可讀性。請協助使用者釐清目標，並將大任務拆分為具體可行的步驟。"
        });
      }

      const aiMsg: Message = {
        role: 'model',
        content: '',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMsg]);

      if (typeof aiSessionRef.current.promptStreaming === 'function') {
        const stream = await aiSessionRef.current.promptStreaming(textToSend);
        for await (const chunk of stream) {
          setMessages(prev => {
            const newMsgs = [...prev];
            newMsgs[newMsgs.length - 1].content = chunk;
            return newMsgs;
          });
        }
      } else {
        const response = await aiSessionRef.current.prompt(textToSend);
        setMessages(prev => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1].content = response;
          return newMsgs;
        });
      }
    } catch (error: any) {
      setErrorMsg(error?.message || '呼叫本地 AI 發生錯誤。');
    } finally {
      setIsLoading(false);
    }
  };

  // 一鍵專案管理快捷操作
  const handleQuickAction = (actionType: 'breakdown' | 'progress' | 'risk' | 'meeting') => {
    const contextToUse = clipboardText || pageContext;
    if (!contextToUse) {
      alert('請先複製內容或開啟含有任務資訊的網頁！');
      return;
    }

    let prompt = '';
    switch (actionType) {
      case 'breakdown':
        prompt = `請幫我將以下專案目標/內容拆解成具體可執行的子任務清單（Action Items），請用條列式呈現：\n\n"${contextToUse}"`;
        break;
      case 'progress':
        prompt = `請根據以下雜亂的工作紀錄或文字，幫我整理成一份簡潔清晰的進度更新報告：\n\n"${contextToUse}"`;
        break;
      case 'risk':
        prompt = `請分析以下任務描述或計畫中可能潛在的風險，並提出具體的緩解與預防建議：\n\n"${contextToUse}"`;
        break;
      case 'meeting':
        prompt = `請將以下會議記錄或討論串總結出關鍵結論與後續的待辦事項：\n\n"${contextToUse}"`;
        break;
    }

    handleSendMessage(prompt);
  };

  // 複製 AI 產出的內容
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (e) {
      alert('複製失敗，請手動選取複製');
    }
  };

  // 手動貼上剪貼簿文字到輸入框
  const pasteClipboardToInput = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputValue(prev => prev + text);
      } else {
        alert('剪貼簿目前沒有文字內容');
      }
    } catch (e) {
      alert('無法存取剪貼簿，請使用 Ctrl+V 貼上');
    }
  };

  // 極簡的 Markdown 渲染 (避免第三方套件)
  const renderMarkdown = (text: string, msgIndex: number) => {
    return text.split('\n').map((line, idx) => {
      // 處理粗體 **text**
      let formattedLine = line;
      const boldRegex = /\*\*(.*?)\*\*/g;
      formattedLine = formattedLine.replace(boldRegex, '<strong class="font-bold text-dark-primary">$1</strong>');

      // 處理斜體 *text*
      const italicRegex = /\*(.*?)\*/g;
      formattedLine = formattedLine.replace(italicRegex, '<em class="italic">$1</em>');

      // 處理行內代碼 `code`
      const inlineCodeRegex = /`(.*?)`/g;
      formattedLine = formattedLine.replace(inlineCodeRegex, '<code class="bg-dark-surface px-1 py-0.5 rounded text-red-400 border border-dark-border-default font-mono text-sm">$1</code>');

      // 處理標題
      if (line.startsWith('### ')) {
        return <h4 key={idx} className="text-md font-bold text-dark-primary mt-3 mb-1" dangerouslySetInnerHTML={{ __html: formattedLine.replace('### ', '') }} />;
      }
      if (line.startsWith('## ')) {
        return <h3 key={idx} className="text-lg font-bold text-dark-primary mt-4 mb-2 border-b border-dark-border-subtle pb-1" dangerouslySetInnerHTML={{ __html: formattedLine.replace('## ', '') }} />;
      }
      if (line.startsWith('# ')) {
        return <h2 key={idx} className="text-xl font-bold text-dark-primary mt-4 mb-2" dangerouslySetInnerHTML={{ __html: formattedLine.replace('# ', '') }} />;
      }

      // 處理無序列表與 Checkbox
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const contentStr = formattedLine.substring(2);
        
        // 解析待辦清單 Checkbox
        if (contentStr.startsWith('[ ] ') || contentStr.startsWith('[x] ')) {
          const isChecked = contentStr.startsWith('[x] ');
          const labelText = contentStr.substring(4);
          
          return (
            <div key={idx} className="flex items-start gap-2 my-1 text-dark-secondary ml-1">
              <input 
                type="checkbox" 
                className="mt-1 w-3.5 h-3.5 rounded border-dark-border-default text-blue-500 bg-dark-surface focus:ring-blue-500/30 focus:ring-offset-0 cursor-pointer"
                checked={isChecked}
                onChange={() => {
                  setMessages(prev => {
                    const newMsgs = [...prev];
                    const msgLines = newMsgs[msgIndex].content.split('\n');
                    const oldLine = msgLines[idx];
                    if (isChecked) {
                      msgLines[idx] = oldLine.replace('[x]', '[ ]');
                    } else {
                      msgLines[idx] = oldLine.replace('[ ]', '[x]');
                    }
                    newMsgs[msgIndex].content = msgLines.join('\n');
                    return newMsgs;
                  });
                }}
              />
              <span className={isChecked ? "line-through opacity-50 transition-all" : "transition-all"} dangerouslySetInnerHTML={{ __html: labelText }} />
            </div>
          );
        }

        return (
          <ul key={idx} className="list-disc pl-5 my-1 text-dark-secondary">
            <li dangerouslySetInnerHTML={{ __html: contentStr }} />
          </ul>
        );
      }

      // 處理有序列表 (e.g. 1. 2.)
      const numListRegex = /^\d+\.\s(.*)/;
      if (numListRegex.test(line)) {
        const match = line.match(numListRegex);
        return (
          <ol key={idx} className="list-decimal pl-5 my-1 text-dark-secondary">
            <li dangerouslySetInnerHTML={{ __html: formattedLine.replace(/^\d+\.\s/, '') }} />
          </ol>
        );
      }

      // 處理空行
      if (line.trim() === '') {
        return <div key={idx} className="h-2" />;
      }

      // 一般段落
      return <p key={idx} className="my-1.5 leading-relaxed text-dark-secondary" dangerouslySetInnerHTML={{ __html: formattedLine }} />;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="w-96 bg-dark-card border-l border-dark-border-subtle shadow-2xl flex flex-col h-screen overflow-hidden animate-slide-in relative z-50 shadow-slate-950/80">
      {/* 標頭 */}
      <div className="p-4 border-b border-dark-border-subtle bg-dark-surface text-white flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-xl">🤖</span>
          <div>
            <h3 className="font-bold text-sm tracking-wider">PK+ Copilot</h3>
            <p className="text-xs text-dark-muted">Gemini Nano 驅動</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="text-dark-muted hover:text-dark-primary transition-colors text-lg p-1"
          title="收合側邊欄"
        >
          ✕
        </button>
      </div>

      {/* 本地 AI 啟用指引 */}
      {aiAvailable === 'no' && (
        <div className="p-3.5 m-3 bg-red-950/40 border border-red-900/50 text-red-400 rounded-xl text-xs leading-relaxed shadow-lg">
          <strong className="text-sm font-semibold flex items-center gap-1 mb-1 text-red-300">
            ⚠️ 未偵測到本地 AI 模型
          </strong>
          請開啟新分頁並輸入 
          <code className="mx-1 bg-dark-surface px-1 py-0.5 rounded text-red-300 font-mono border border-red-900/30">
            chrome://flags
          </code>，將以下兩項設為 <strong>Enabled</strong> 並重啟瀏覽器以自動下載模型：
          <ul className="list-disc list-inside mt-1.5 space-y-1 text-dark-muted">
            <li><strong>Prompt API for Gemini Nano</strong></li>
            <li><strong>Enables optimization guide on device</strong></li>
          </ul>
        </div>
      )}

      {/* 快捷寫作增強面板 */}
      <div className="p-3 bg-dark-surface border-b border-dark-border-subtle">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-dark-secondary flex items-center gap-1">
            📋 任務內容快取
          </span>
          <button 
            onClick={fetchContexts}
            className="text-[10px] text-blue-400 hover:text-blue-300 hover:underline flex items-center font-semibold"
            title="手動重新擷取網頁內容"
          >
            🔄 重新擷取
          </button>
        </div>
        
        {(clipboardText || pageContext) ? (
          <div className="mb-2 p-1.5 bg-dark-card border border-dark-border-default rounded text-xs text-dark-muted max-h-20 overflow-y-auto italic">
            {clipboardText && (
              <div className="mb-1">
                <span className="font-bold text-dark-primary text-[10px]">📋 剪貼簿：</span>
                「{clipboardText.length > 50 ? `${clipboardText.substring(0, 50)}...` : clipboardText}」
              </div>
            )}
            {pageContext && (
              <div>
                <span className="font-bold text-dark-primary text-[10px]">🌐 網頁 ({pageTitle})：</span>
                「{pageContext.length > 50 ? `${pageContext.substring(0, 50)}...` : pageContext}」
              </div>
            )}
          </div>
        ) : (
          <div className="mb-2 text-[11px] text-dark-muted italic">
            尚未偵測到已複製文字或網頁內容。請複製任務說明或在任務系統頁面點擊重新擷取。
          </div>
        )}

        <div className="grid grid-cols-4 gap-1.5">
          <button
            onClick={() => handleQuickAction('breakdown')}
            disabled={!(clipboardText || pageContext)}
            className="px-2 py-1.5 bg-indigo-950/30 border border-indigo-900/40 hover:bg-indigo-900/30 disabled:opacity-40 text-indigo-300 rounded text-xs font-semibold transition-all text-center"
          >
            🧩 任務拆解
          </button>
          <button
            onClick={() => handleQuickAction('progress')}
            disabled={!(clipboardText || pageContext)}
            className="px-2 py-1.5 bg-emerald-950/30 border border-emerald-900/40 hover:bg-emerald-900/30 disabled:opacity-40 text-emerald-300 rounded text-xs font-semibold transition-all text-center"
          >
            📊 進度總結
          </button>
          <button
            onClick={() => handleQuickAction('risk')}
            disabled={!(clipboardText || pageContext)}
            className="px-2 py-1.5 bg-amber-950/30 border border-amber-900/40 hover:bg-amber-900/30 disabled:opacity-40 text-amber-300 rounded text-xs font-semibold transition-all text-center"
          >
            ⚠️ 揪出風險
          </button>
          <button
            onClick={() => handleQuickAction('meeting')}
            disabled={!(clipboardText || pageContext)}
            className="px-2 py-1.5 bg-purple-950/30 border border-purple-900/40 hover:bg-purple-900/30 disabled:opacity-40 text-purple-300 rounded text-xs font-semibold transition-all text-center"
          >
            📝 會議重點
          </button>
        </div>
      </div>

      {/* 訊息對話區 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-dark-surface">
        {messages.length === 0 && (
          <div className="text-center text-dark-muted py-12 px-6">
            <span className="text-4xl block mb-3">💬</span>
            <p className="text-sm font-semibold text-dark-primary mb-1">我是您的 AI 專案管理助理</p>
            <p className="text-xs text-dark-muted leading-relaxed">
              您可以直接輸入問題，或是使用上方面板對您複製下來的任務內容或討論紀錄進行一鍵分析、拆解與總結。
            </p>
          </div>
        )}

        {messages.map((msg, index) => (
          <div 
            key={index}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="text-[10px] text-dark-muted mb-1 px-1">
              {msg.role === 'user' ? '你' : 'Gemini Copilot'} · {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </div>
            
            <div 
              className={`max-w-[90%] rounded-2xl px-4 py-2.5 shadow-sm text-sm ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none shadow-md shadow-blue-950/30' 
                  : 'bg-dark-card text-dark-secondary rounded-tl-none border border-dark-border-default shadow-md shadow-slate-950/20'
              }`}
            >
              {msg.role === 'user' ? (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <div>
                  {renderMarkdown(msg.content, index)}
                  
                  <div className="mt-3 pt-2 border-t border-dark-border-default flex justify-end">
                    <button
                      onClick={() => copyToClipboard(msg.content)}
                      className="px-2 py-1 bg-dark-surface hover:bg-dark-hover border border-dark-border-default rounded text-[10px] text-dark-secondary font-semibold flex items-center gap-1 transition-colors"
                      title="點擊複製此生成結果並直接貼回 Docs"
                    >
                      {isCopied ? '✅ 已複製！' : '📋 點擊複製貼回 Docs'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex flex-col items-start animate-pulse">
            <div className="text-[10px] text-dark-muted mb-1 px-1">Gemini Copilot 正在思考...</div>
            <div className="bg-dark-card border border-dark-border-default rounded-2xl rounded-tl-none px-4 py-3 text-sm text-dark-muted flex items-center gap-2">
              <span className="w-2 h-2 bg-dark-muted rounded-full animate-bounce"></span>
              <span className="w-2 h-2 bg-dark-muted rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-2 h-2 bg-dark-muted rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}
        {errorMsg && (
          <div className="p-3 bg-red-950/30 border border-red-900/40 text-red-400 rounded-lg text-xs">
            ⚠️ {errorMsg}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 輸入區 */}
      <div className="p-3 border-t border-dark-border-subtle bg-dark-card flex flex-col gap-2">
        <div className="flex gap-2 items-center">
          <button
            onClick={pasteClipboardToInput}
            className="px-2 py-1 bg-dark-surface hover:bg-dark-hover border border-dark-border-default rounded text-[10px] text-dark-secondary font-semibold transition-colors flex items-center gap-0.5 whitespace-nowrap"
            title="將剪貼簿文字直接填入輸入框"
          >
            📥 貼入剪貼簿
          </button>
          <button
            onClick={() => setMessages([])}
            className="px-2 py-1 bg-dark-surface hover:bg-red-950/40 hover:text-red-400 border border-dark-border-default rounded text-[10px] text-dark-secondary font-semibold transition-colors ml-auto"
            title="清空目前對話紀錄"
          >
            🧹 清除對話
          </button>
        </div>
        <div className="flex gap-2">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="請輸入您的問題，或按 Shift+Enter 換行..."
            rows={2}
            className="flex-1 px-3 py-1.5 bg-dark-surface border border-dark-border-default rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-dark-primary text-sm resize-none"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || isLoading}
            className="px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-dark-hover disabled:text-dark-muted text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center whitespace-nowrap shadow-md shadow-blue-950/30"
          >
            發送
          </button>
        </div>
      </div>
    </div>
  );
};
