import React from 'react';
import { SprintLogsTabProps } from './types';

export const SprintLogsTab: React.FC<SprintLogsTabProps> = ({ sprintLogs }) => {
  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toISOString().replace('T', ' ').substring(0, 16);
  };

  return (
    <div className="p-6">
      {sprintLogs.length === 0 ? (
        <div className="text-center py-12 text-dark-muted">
          <span className="text-4xl block mb-2">⏱️</span>
          目前沒有任何番茄鐘衝刺紀錄。
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-dark-secondary">
            <thead className="bg-dark-surface text-dark-primary border-b border-dark-border-subtle text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Log ID</th>
                <th className="px-6 py-4">Task Title</th>
                <th className="px-6 py-4">Duration (Mins)</th>
                <th className="px-6 py-4 w-1/2">Sprint Result</th>
                <th className="px-6 py-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border-subtle">
              {sprintLogs.map((row) => {
                const minutes = Math.round((row.endTime - row.startTime) / 60000);
                return (
                  <tr key={row.sprintId} className="hover:bg-dark-hover/40 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-dark-muted" title={row.sprintId}>
                      {row.sprintId.substring(0, 8)}
                    </td>
                    <td className="px-6 py-4 font-medium text-dark-primary">
                      {row.missionText}
                    </td>
                    <td className="px-6 py-4 font-semibold">{minutes || 25} 分鐘</td>
                    <td className="px-6 py-4 text-dark-primary">{row.result}</td>
                    <td className="px-6 py-4 text-xs text-dark-muted">{formatTime(row.startTime)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
