import React, { useState, useEffect, useRef } from 'react';
import { sync } from '../../../core/api/sync';
import { storage } from '../../../core/chrome/storage';

export const QuickCapture: React.FC = () => {
  const [task, setTask] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [adapterType, setAdapterType] = useState<'google' | 'notion'>('google');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 自動聚焦
    if (inputRef.current) {
      inputRef.current.focus();
    }
    
    // 獲取目前設定的 Adapter
    storage.getUserSettings().then(settings => {
      if (settings.taskAdapter === 'notion') {
        setAdapterType('notion');
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task.trim()) return;

    setIsSubmitting(true);
    let contextText = '';
    let contextUrl = '';

    try {
      if (chrome?.tabs?.query) {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs && tabs.length > 0) {
          const tab = tabs[0];
          if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
            contextUrl = tab.url;
            contextText = `\n\n> **Context**: [${tab.title || 'Link'}](${tab.url})`;
          }
        }
      }
    } catch (e) {
      console.warn('Cannot access tabs API', e);
    }

    // 同步到本地 Inbox 快取
    try {
      const currentInbox = await storage.getInboxItems();
      const newItem = {
        id: 'inbox-' + Date.now(),
        text: task.trim(),
        contextUrl: contextUrl || undefined,
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        processed: false
      };
      currentInbox.push(newItem);
      await storage.saveInboxItems(currentInbox);
    } catch (err) {
      console.warn('本地快取 Inbox 失敗:', err);
    }

    await sync.quickCaptureTask(task, contextText);
    
    // 關閉小視窗
    window.close();
  };

  // 辨識 $TICKER 股票代碼
  const tickerMatch = task.match(/\$([A-Za-z0-9]+)/);
  const detectedTicker = tickerMatch ? tickerMatch[1].toUpperCase() : null;
  const hasFinanceTag = task.includes('#投資研究');

  const applyFinanceSuggestion = () => {
    if (!detectedTicker) return;
    let updated = task;
    if (!hasFinanceTag) {
      updated = updated.trim() + ' #投資研究';
    }
    setTask(updated);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="h-screen w-screen bg-dark-base flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-dark-card rounded-xl shadow-lg p-6 border border-dark-border-subtle shadow-slate-950/40">
        <div className="flex items-center space-x-3 mb-4">
          <span className="text-2xl">⚡</span>
          <h2 className="text-xl font-bold text-dark-primary">閃電捕捉 (Quick Capture)</h2>
        </div>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="輸入待辦事項 (如: 研讀 $NVDA 財報) 並按 Enter..."
            disabled={isSubmitting}
            className="w-full px-4 py-3 text-lg bg-dark-surface border border-dark-border-default rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-dark-primary disabled:bg-dark-hover disabled:text-dark-muted"
          />

          {/* 智能個股代號識別膠囊 */}
          {detectedTicker && (
            <div className="mt-3 flex items-center justify-between p-2.5 bg-blue-950/40 border border-blue-800/50 rounded-lg text-xs animate-fade-in">
              <span className="text-blue-300">
                📈 偵測到個股 <b>${detectedTicker}</b>
              </span>
              <button
                type="button"
                onClick={applyFinanceSuggestion}
                disabled={hasFinanceTag}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900/50 disabled:text-blue-300/60 text-white rounded font-medium transition-colors cursor-pointer"
              >
                {hasFinanceTag ? '已關聯 #投資研究' : '+ 標註 #投資研究 (2 🍅)'}
              </button>
            </div>
          )}

          <div className="mt-4 flex justify-between items-center text-sm text-dark-muted">
            <span>將自動同步至 {adapterType === 'notion' ? 'Notion' : 'Google Tasks'}</span>
            <button
              type="submit"
              disabled={isSubmitting || !task.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 transition-colors shadow-md shadow-blue-950/40"
            >
              {isSubmitting ? '儲存中...' : '送出'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
