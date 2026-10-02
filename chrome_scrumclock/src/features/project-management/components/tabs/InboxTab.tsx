import React, { useState } from 'react';
import { InboxTabProps } from './types';

export const InboxTab: React.FC<InboxTabProps> = ({
  inboxItems,
  onConvertInbox,
  onDeleteInbox,
  onAddInboxItem,
}) => {
  const [inputText, setInputText] = useState('');

  const handleAdd = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    await onAddInboxItem(inputText.trim());
    setInputText('');
  };

  return (
    <div className="p-6">
      {/* 收件匣引導橫幅 */}
      <div className="mb-6 bg-purple-950/20 border border-purple-800/40 rounded-xl p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-sm text-purple-200">
          <span className="text-xl">⚡</span>
          <div>
            <span className="font-semibold text-white">靈感收件匣 (GTD Inbox)：</span>
            <span className="text-purple-300/90 ml-1">
              暫存零碎想法、未整理之靈感與待研讀網頁。點擊「🗃️ 轉為任務」即可設定優先級並納入每週任務池進行排程。
            </span>
          </div>
        </div>
      </div>

      {/* 快速捕捉輸入區 */}
      <form onSubmit={handleAdd} className="mb-6 bg-dark-surface p-4 rounded-xl border border-dark-border-subtle flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="捕捉零碎靈感或待辦事項，按下 Enter 或點擊按鈕加入收件匣..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 min-w-[280px] px-3.5 py-2 bg-dark-card border border-dark-border-default rounded-lg text-sm text-dark-primary outline-none focus:ring-2 focus:ring-purple-500 transition-all placeholder:text-dark-muted"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors shadow-md shadow-purple-950/40 flex items-center gap-1.5 cursor-pointer"
        >
          <span>📥</span>
          <span>記入收件匣</span>
        </button>
      </form>

      {inboxItems.length === 0 ? (
        <div className="text-center py-12 text-dark-muted">
          <span className="text-4xl block mb-2">📥</span>
          收件匣空空如也。請在上方快速記下零碎想法，或使用全域閃電捕捉快捷鍵 (Alt+K)！
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-dark-secondary">
            <thead className="bg-dark-surface text-dark-primary border-b border-dark-border-subtle text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Captured Text</th>
                <th className="px-6 py-4">Context URL</th>
                <th className="px-6 py-4">Created At</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border-subtle">
              {inboxItems.map((row) => (
                <tr key={row.id} className="hover:bg-dark-hover/40 transition-colors">
                  <td className="px-6 py-4 text-dark-primary font-medium">{row.text}</td>
                  <td className="px-6 py-4 max-w-[200px] truncate text-blue-400 hover:text-blue-300 hover:underline cursor-pointer">
                    {row.contextUrl ? (
                      <a href={row.contextUrl} target="_blank" rel="noopener noreferrer">
                        {row.contextUrl}
                      </a>
                    ) : (
                      <span className="text-dark-muted">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs text-dark-muted">{row.createdAt}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => onConvertInbox(row)}
                      className="px-3 py-1.5 bg-blue-900/40 hover:bg-blue-800/40 border border-blue-900/50 text-blue-400 rounded-lg text-xs transition-colors font-semibold cursor-pointer"
                    >
                      🗃️ 轉為任務
                    </button>
                    <button
                      onClick={() => onDeleteInbox(row.id)}
                      className="px-3 py-1.5 bg-red-950/30 hover:bg-red-900/40 border border-red-900/40 text-red-400 rounded-lg text-xs transition-colors cursor-pointer"
                    >
                      ❌ 刪除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
