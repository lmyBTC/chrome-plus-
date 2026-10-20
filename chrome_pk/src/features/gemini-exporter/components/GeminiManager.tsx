import React, { useState, useEffect } from 'react';
import { GeminiConversation, convertToMarkdown, triggerDownload } from '../utils/exporter';

export const GeminiManager: React.FC = () => {
  const [conversations, setConversations] = useState<GeminiConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // 讀取本地對話
  const loadConversations = async () => {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const result = await chrome.storage.local.get('geminiConversations');
        const list = result.geminiConversations || [];
        setConversations(list);
        if (list.length > 0 && !selectedId) {
          setSelectedId(list[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
    
    // 監聽 storage 變化以實現即時刷新
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.geminiConversations) {
        setConversations(changes.geminiConversations.newValue || []);
      }
    };
    
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.onChanged.addListener(handleStorageChange);
    }
    
    return () => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.onChanged.removeListener(handleStorageChange);
      }
    };
  }, []);

  // 刪除單個對話
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = conversations.filter(c => c.id !== id);
    setConversations(updated);
    if (selectedId === id) {
      setSelectedId(updated.length > 0 ? updated[0].id : null);
    }
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.set({ geminiConversations: updated });
    }
  };

  // 清空所有對話
  const handleClearAll = async () => {
    if (window.confirm('確定要清空所有已擷取的對話紀錄嗎？此動作無法復原。')) {
      setConversations([]);
      setSelectedId(null);
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.set({ geminiConversations: [] });
      }
    }
  };

  // 匯出為 Markdown
  const exportMarkdown = (conv: GeminiConversation) => {
    const mdContent = convertToMarkdown(conv);
    const dateStr = new Date(conv.timestamp).toISOString().split('T')[0];
    const safeTitle = conv.title.replace(/[\\/:*?"<>|]/g, '_');
    triggerDownload(`gemini_${safeTitle}_${dateStr}.md`, mdContent);
  };

  // 匯出為 JSON
  const exportJson = (conv: GeminiConversation) => {
    const jsonContent = JSON.stringify(conv, null, 2);
    const dateStr = new Date(conv.timestamp).toISOString().split('T')[0];
    const safeTitle = conv.title.replace(/[\\/:*?"<>|]/g, '_');
    triggerDownload(`gemini_${safeTitle}_${dateStr}.json`, jsonContent, 'application/json');
  };

  // 篩選對話
  const filteredConversations = conversations.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.messages.some(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const activeConversation = conversations.find(c => c.id === selectedId);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-dark-bg min-h-screen text-dark-secondary">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-row h-screen bg-dark-bg overflow-hidden text-dark-primary">
      {/* 左側清單面板 */}
      <div className="w-80 border-r border-dark-border-subtle flex flex-col bg-dark-surface/30 backdrop-blur-md">
        <div className="p-4 border-b border-dark-border-subtle flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-dark-primary flex items-center gap-2">
              <span>🤖</span> Gemini 對話記錄
            </h2>
            {conversations.length > 0 && (
              <button 
                onClick={handleClearAll}
                className="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                全部清空
              </button>
            )}
          </div>
          <input 
            type="text"
            placeholder="搜尋對話或關鍵字..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-dark-card border border-dark-border-subtle rounded-md text-dark-primary placeholder-dark-muted focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* 對話清單 */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-xs text-dark-muted">
              {searchQuery ? '無相符的搜尋結果' : '尚無已擷取的對話'}
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setSelectedId(conv.id)}
                className={`p-3 rounded-lg border transition-all cursor-pointer group relative flex flex-col gap-1.5 ${
                  selectedId === conv.id
                    ? 'bg-blue-600/10 border-blue-500/40 text-dark-primary shadow-sm shadow-blue-500/5'
                    : 'bg-dark-card/50 border-dark-border-subtle hover:bg-dark-hover hover:border-dark-border-subtle/80'
                }`}
              >
                <div className="font-medium text-xs truncate pr-6 text-dark-primary group-hover:text-blue-400 transition-colors">
                  {conv.title}
                </div>
                <div className="flex justify-between items-center text-[10px] text-dark-muted">
                  <span>{conv.messages.length} 條訊息</span>
                  <span>{new Date(conv.timestamp).toLocaleDateString()}</span>
                </div>
                <button
                  onClick={(e) => handleDelete(conv.id, e)}
                  className="absolute right-2 top-2 text-dark-muted hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-1"
                  title="刪除對話"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 右側展示面板 */}
      <div className="flex-1 flex flex-col bg-dark-bg/20 overflow-hidden">
        {activeConversation ? (
          <>
            {/* 標題與操作欄 */}
            <div className="p-4 border-b border-dark-border-subtle bg-dark-surface/40 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm text-dark-primary truncate max-w-xl">
                  {activeConversation.title}
                </h3>
                <p className="text-[10px] text-dark-muted mt-0.5">
                  擷取於: {new Date(activeConversation.timestamp).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => exportMarkdown(activeConversation)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600/80 hover:bg-blue-600 text-white rounded-md transition-colors"
                >
                  📥 匯出 Markdown
                </button>
                <button
                  onClick={() => exportJson(activeConversation)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-dark-hover hover:bg-dark-card text-dark-secondary rounded-md border border-dark-border-subtle transition-colors"
                >
                  📥 匯出 JSON
                </button>
              </div>
            </div>

            {/* 訊息流 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-dark-bg/40">
              {activeConversation.messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-2xl px-4 py-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-blue-600/20 text-blue-100 rounded-tr-none border border-blue-500/20'
                        : 'bg-dark-card/90 text-dark-secondary rounded-tl-none border border-dark-border-subtle/50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-[10px] font-semibold tracking-wider uppercase opacity-75">
                      <span>{msg.role === 'user' ? '👤 User' : '🤖 Gemini'}</span>
                    </div>
                    <div 
                      className="gemini-html-content select-text" 
                      dangerouslySetInnerHTML={{ __html: msg.content }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-dark-bg/10">
            <div className="w-16 h-16 rounded-full bg-dark-card flex items-center justify-center text-3xl mb-4 border border-dark-border-subtle shadow-md shadow-slate-950/20 animate-bounce">
              🤖
            </div>
            <h3 className="text-base font-bold text-dark-primary">開啟自動擷取對話功能</h3>
            <p className="text-xs text-dark-muted max-w-sm mt-2 leading-relaxed">
              當您在瀏覽器中使用 Gemini 網頁時，擴充功能會在背景自動分析與匯出您的對話記錄。
            </p>
            <a
              href="https://gemini.google.com/"
              target="_blank"
              rel="noreferrer"
              className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-500 transition-all font-medium shadow-md shadow-blue-500/10"
            >
              🚀 前往 Gemini 網頁版
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
