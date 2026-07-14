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

    try {
      if (chrome?.tabs?.query) {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs && tabs.length > 0) {
          const tab = tabs[0];
          if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
            contextText = `\n\n> **Context**: [${tab.title || 'Link'}](${tab.url})`;
          }
        }
      }
    } catch (e) {
      console.warn('Cannot access tabs API', e);
    }

    await sync.quickCaptureTask(task, contextText);
    
    // 關閉小視窗
    window.close();
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
            placeholder="輸入待辦事項並按下 Enter..."
            disabled={isSubmitting}
            className="w-full px-4 py-3 text-lg bg-dark-surface border border-dark-border-default rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-dark-primary disabled:bg-dark-hover disabled:text-dark-muted"
          />
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
