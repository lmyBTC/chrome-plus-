import React from 'react';
import { InboxTabProps } from './types';

export const InboxTab: React.FC<InboxTabProps> = ({
  inboxItems,
  onConvertInbox,
  onDeleteInbox
}) => {
  return (
    <div className="p-6">
      {inboxItems.length === 0 ? (
        <div className="text-center py-12 text-dark-muted">
          <span className="text-4xl block mb-2">📥</span>
          收件匣空空如也。請使用閃電捕捉快速記下零碎想法！
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
                      className="px-3 py-1.5 bg-blue-900/40 hover:bg-blue-800/40 border border-blue-900/50 text-blue-400 rounded-lg text-xs transition-colors font-semibold"
                    >
                      🗃️ 轉為任務
                    </button>
                    <button
                      onClick={() => onDeleteInbox(row.id)}
                      className="px-3 py-1.5 bg-red-950/30 hover:bg-red-900/40 border border-red-900/40 text-red-400 rounded-lg text-xs transition-colors"
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
