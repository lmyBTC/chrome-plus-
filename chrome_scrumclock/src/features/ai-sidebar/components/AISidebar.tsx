import React, { useState, useEffect, useRef } from 'react';
import { storage } from '../../../core/chrome/storage';

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
      const aiAPI = (window as any).ai?.languageModel || (chrome as any)?.aiLanguageModel;
      if (!aiAPI) {
        setAiAvailable('no');
        return;
      }

      const capabilities = await aiAPI.capabilities();
      if (capabilities.available === 'no') {
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
      checkClipboard();
    }
  }, [messages, isOpen]);

  // 嘗試讀取剪貼簿內容 (做為輔助)
  const checkClipboard = async () => {
    try {
      // 網頁版常規需要權限，如果拒絕則使用 fallback
      const text = await navigator.clipboard.readText();
      if (text && text.trim().length > 0) {
        setClipboardText(text.trim());
      }
    } catch (e) {
      // 靜默失敗：說明瀏覽器需要權限，或不支援背景讀取
      console.log('無法直接讀取剪貼簿，將使用手動貼上');
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
      const aiAPI = (window as any).ai?.languageModel || (chrome as any)?.aiLanguageModel;
      if (!aiAPI) {
        setErrorMsg('無法取得本地 AI API 呼叫路徑。');
        setIsLoading(false);
        return;
      }
      if (!aiSessionRef.current) {
        aiSessionRef.current = await aiAPI.create({
          systemPrompt: "你是一個辦公效率與寫作助理。請用繁體中文回答，排版請清晰乾淨，多用 Markdown 的標題、清單與粗體來增強可讀性。如果使用者要求優化文章，請保留原本的優點並提供具體的改進理由。"
        });
      }

      const response = await aiSessionRef.current.prompt(textToSend);
      
      const aiMsg: Message = {
        role: 'model',
        content: response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error: any) {
      setErrorMsg(error?.message || '呼叫本地 AI 發生錯誤。');
    } finally {
      setIsLoading(false);
    }
  };

  // 一鍵寫作優化快捷操作
  const handleQuickAction = (actionType: 'polish' | 'expand' | 'summarize' | 'translate') => {
    if (!clipboardText) {
      alert('請先複製 Docs 中的段落，再來點擊優化按鈕！');
      return;
    }

    let prompt = '';
    switch (actionType) {
      case 'polish':
        prompt = `請幫我潤色以下這段文字，提升其專業度與流暢度，保持原本的語意：\n\n"${clipboardText}"`;
        break;
      case 'expand':
        prompt = `請幫我擴寫以下這段文字，補充細節並使其更豐富有說服力：\n\n"${clipboardText}"`;
        break;
      case 'summarize':
        prompt = `請幫我精簡總結以下這段文字的重點，用條列式呈現：\n\n"${clipboardText}"`;
        break;
      case 'translate':
        prompt = `請幫我將以下這段文字精確地翻譯成繁體中文（如果是中文則翻譯成專業英文），符合商務語境：\n\n"${clipboardText}"`;
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
  const renderMarkdown = (text: string) => {
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

      // 處理無序列表
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return (
          <ul key={idx} className="list-disc pl-5 my-1 text-dark-secondary">
            <li dangerouslySetInnerHTML={{ __html: formattedLine.substring(2) }} />
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
            <h3 className="font-bold text-sm tracking-wider">Scrumclock Copilot</h3>
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
            📋 剪貼簿快取偵測
          </span>
          <button 
            onClick={checkClipboard}
            className="text-[10px] text-blue-400 hover:text-blue-300 hover:underline flex items-center font-semibold"
            title="手動重新整理剪貼簿內容"
          >
            🔄 重新讀取
          </button>
        </div>
        
        {clipboardText ? (
          <div className="mb-2 p-1.5 bg-dark-card border border-dark-border-default rounded text-xs text-dark-muted max-h-12 overflow-y-auto italic">
            「{clipboardText.length > 50 ? `${clipboardText.substring(0, 50)}...` : clipboardText}」
          </div>
        ) : (
          <div className="mb-2 text-[11px] text-dark-muted italic">
            尚未偵測到已複製文字。請在 Google Docs 中複製一段文字以啟動快捷優化。
          </div>
        )}

        <div className="grid grid-cols-4 gap-1.5">
          <button
            onClick={() => handleQuickAction('polish')}
            disabled={!clipboardText}
            className="px-2 py-1.5 bg-indigo-950/30 border border-indigo-900/40 hover:bg-indigo-900/30 disabled:opacity-40 text-indigo-300 rounded text-xs font-semibold transition-all text-center"
          >
            ✨ 潤色
          </button>
          <button
            onClick={() => handleQuickAction('expand')}
            disabled={!clipboardText}
            className="px-2 py-1.5 bg-emerald-950/30 border border-emerald-900/40 hover:bg-emerald-900/30 disabled:opacity-40 text-emerald-300 rounded text-xs font-semibold transition-all text-center"
          >
            📝 擴寫
          </button>
          <button
            onClick={() => handleQuickAction('summarize')}
            disabled={!clipboardText}
            className="px-2 py-1.5 bg-amber-950/30 border border-amber-900/40 hover:bg-amber-900/30 disabled:opacity-40 text-amber-300 rounded text-xs font-semibold transition-all text-center"
          >
            📊 精簡
          </button>
          <button
            onClick={() => handleQuickAction('translate')}
            disabled={!clipboardText}
            className="px-2 py-1.5 bg-purple-950/30 border border-purple-900/40 hover:bg-purple-900/30 disabled:opacity-40 text-purple-300 rounded text-xs font-semibold transition-all text-center"
          >
            🌐 翻譯
          </button>
        </div>
      </div>

      {/* 訊息對話區 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-dark-surface">
        {messages.length === 0 && (
          <div className="text-center text-dark-muted py-12 px-6">
            <span className="text-4xl block mb-3">💬</span>
            <p className="text-sm font-semibold text-dark-primary mb-1">我是您的 AI 瑞士刀助理</p>
            <p className="text-xs text-dark-muted leading-relaxed">
              您可以直接輸入問題，或是使用上方面板對您從 Google Docs 複製下來的文字進行一鍵優化。
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
                  {renderMarkdown(msg.content)}
                  
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
