import React, { useState, useMemo } from 'react';
import { SprintLogsTabProps, SprintLogWithMission } from './types';
import { WeeklyReportModal } from '../modals/WeeklyReportModal';
import { JiraWorklogModal } from '../modals/JiraWorklogModal';

export const SprintLogsTab: React.FC<SprintLogsTabProps> = ({ sprintLogs, weeklyMissions = [] }) => {
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isJiraOpen, setIsJiraOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedRowId, setCopiedRowId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toISOString().replace('T', ' ').substring(0, 16);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 搜尋過濾
  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return sprintLogs;
    const q = searchQuery.toLowerCase();
    return sprintLogs.filter(
      (log) =>
        log.missionText.toLowerCase().includes(q) ||
        (log.result && log.result.toLowerCase().includes(q)) ||
        log.sprintId.toLowerCase().includes(q)
    );
  }, [sprintLogs, searchQuery]);

  // 單列複製 Jira 格式
  const handleCopySingleJira = async (row: SprintLogWithMission) => {
    const mins = Math.round((row.endTime - row.startTime) / 60000) || 25;
    const timeStr = formatTime(row.startTime);
    const prio = row.priority ? `[${row.priority}] ` : '';
    const urlPart = row.missionUrl ? ` | URL: ${row.missionUrl}` : '';
    const intrPart = row.interruptionCount && row.interruptionCount > 0 ? ` (中斷: ${row.interruptionCount}次)` : '';
    const jiraText = `[${timeStr}] ${prio}${row.missionText} (${mins}m) - ${row.result || '專注衝刺'}${intrPart}${urlPart}`;

    try {
      await navigator.clipboard.writeText(jiraText);
      setCopiedRowId(row.sprintId);
      setTimeout(() => setCopiedRowId(null), 2000);
    } catch (e) {
      console.error('複製失敗:', e);
      showToast('複製到剪貼簿失敗');
    }
  };

  // 導出為標準 CSV (包含 UTF-8 BOM，防止 Excel 亂碼)
  const handleExportCsv = () => {
    if (sprintLogs.length === 0) {
      showToast('目前尚無衝刺日誌可導出');
      return;
    }

    const headers = [
      'Sprint ID',
      '任務名稱',
      '開始時間',
      '結束時間',
      '耗時(分鐘)',
      '衝刺結果描述',
      '中斷次數',
      '中斷原因',
      '關聯網址',
      '任務ID',
    ];

    const escapeCsv = (str: string | number | undefined | null) => {
      if (str === undefined || str === null) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = sprintLogs.map((log) => {
      const minutes = Math.round((log.endTime - log.startTime) / 60000) || 25;
      const startStr = new Date(log.startTime).toISOString().replace('T', ' ').substring(0, 19);
      const endStr = new Date(log.endTime).toISOString().replace('T', ' ').substring(0, 19);
      const reasons = (log.interruptionReasons || []).join('; ');
      return [
        escapeCsv(log.sprintId),
        escapeCsv(log.missionText),
        escapeCsv(startStr),
        escapeCsv(endStr),
        escapeCsv(minutes),
        escapeCsv(log.result),
        escapeCsv(log.interruptionCount || 0),
        escapeCsv(reasons),
        escapeCsv(log.missionUrl || ''),
        escapeCsv(log.missionId),
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().substring(0, 10);
    a.download = `scrumclock_sprint_logs_${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`已成功導出 ${sprintLogs.length} 筆衝刺工時 CSV 檔案！`);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-emerald-900/90 border border-emerald-600/50 text-emerald-200 text-xs font-semibold rounded-xl shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2">
          ✓ {toastMessage}
        </div>
      )}

      {/* Modals */}
      <WeeklyReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        sprintLogs={sprintLogs}
        weeklyMissions={weeklyMissions}
      />

      <JiraWorklogModal
        isOpen={isJiraOpen}
        onClose={() => setIsJiraOpen(false)}
        sprintLogs={sprintLogs}
      />

      {/* Action Toolbar Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-dark-surface/60 border border-dark-border-subtle p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-dark-primary">番茄鐘衝刺日誌</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-dark-base text-dark-muted border border-dark-border-subtle">
              {sprintLogs.length} 筆
            </span>
          </div>

          {/* 搜尋過濾框 */}
          <div className="relative">
            <input
              type="text"
              placeholder="搜尋任務或日誌..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-dark-base border border-dark-border-subtle rounded-lg px-3 py-1.5 text-xs text-dark-primary placeholder-dark-muted focus:outline-none focus:border-indigo-500 w-48"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1.5 text-xs text-dark-muted hover:text-dark-primary"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* 產生敏捷週報 (SC-V02) */}
          <button
            onClick={() => setIsReportOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
            title="自動聚合本週已完成任務、耗損番茄鐘、衝刺達成率與中斷次數"
          >
            <span>📋</span>
            <span>產生本週敏捷週報</span>
          </button>

          {/* Jira Worklog 拋轉 (EF-03) */}
          <button
            onClick={() => setIsJiraOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5"
            title="複製為 Jira Wiki 表格或 Tempo 條列格式"
          >
            <span>💼</span>
            <span>Jira 工時拋轉</span>
          </button>

          {/* 導出 CSV (EF-03) */}
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-dark-base hover:bg-dark-hover border border-dark-border-subtle text-dark-primary transition-all flex items-center gap-1.5"
            title="導出為含 UTF-8 BOM 之 CSV 檔案"
          >
            <span>📥</span>
            <span>導出 CSV</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      {filteredLogs.length === 0 ? (
        <div className="text-center py-16 bg-dark-surface/30 border border-dark-border-subtle rounded-2xl text-dark-muted">
          <span className="text-4xl block mb-2">⏱️</span>
          {sprintLogs.length === 0
            ? '目前沒有任何番茄鐘衝刺紀錄。在每日焦點戰役中啟動番茄鐘衝刺即可在此累積日誌！'
            : '找不到符合關鍵字的衝刺紀錄。'}
        </div>
      ) : (
        <div className="overflow-x-auto border border-dark-border-subtle rounded-2xl bg-dark-card/60">
          <table className="w-full text-left text-sm text-dark-secondary">
            <thead className="bg-dark-surface/90 text-dark-primary border-b border-dark-border-subtle text-xs uppercase font-semibold">
              <tr>
                <th className="px-5 py-3.5">Log ID</th>
                <th className="px-5 py-3.5">任務名稱</th>
                <th className="px-5 py-3.5">耗時</th>
                <th className="px-5 py-3.5">中斷紀錄</th>
                <th className="px-5 py-3.5 w-1/3">衝刺成果描述</th>
                <th className="px-5 py-3.5">時間戳記</th>
                <th className="px-5 py-3.5 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border-subtle">
              {filteredLogs.map((row) => {
                const minutes = Math.round((row.endTime - row.startTime) / 60000) || 25;
                const hasInterruption = row.interruptionCount && row.interruptionCount > 0;
                const isCopied = copiedRowId === row.sprintId;

                return (
                  <tr key={row.sprintId} className="hover:bg-dark-hover/40 transition-colors">
                    {/* Log ID */}
                    <td className="px-5 py-3.5 font-mono text-xs text-dark-muted" title={row.sprintId}>
                      {row.sprintId.substring(0, 8)}
                    </td>

                    {/* Task Title */}
                    <td className="px-5 py-3.5 font-medium text-dark-primary">
                      <div className="flex items-center gap-2">
                        {row.priority && (
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              row.priority === 'P0'
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : row.priority === 'P1'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-blue-500/20 text-blue-400'
                            }`}
                          >
                            {row.priority}
                          </span>
                        )}
                        <span>{row.missionText}</span>
                        {row.missionUrl && (
                          <a
                            href={row.missionUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-400 hover:text-indigo-300 text-xs"
                            title={row.missionUrl}
                          >
                            🔗
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Duration */}
                    <td className="px-5 py-3.5 font-semibold text-xs whitespace-nowrap">
                      <span className="text-indigo-400">🍅 {minutes} 分鐘</span>
                    </td>

                    {/* Interruption Status */}
                    <td className="px-5 py-3.5 text-xs whitespace-nowrap">
                      {hasInterruption ? (
                        <div
                          className="flex items-center gap-1 text-amber-400 font-semibold cursor-help"
                          title={
                            row.interruptionReasons && row.interruptionReasons.length > 0
                              ? `原因：${row.interruptionReasons.join('、')}`
                              : '中斷原因未記錄'
                          }
                        >
                          <span>⚠️</span>
                          <span>{row.interruptionCount} 次中斷</span>
                        </div>
                      ) : (
                        <span className="text-emerald-400/90 flex items-center gap-1">
                          <span>🛡️</span>
                          <span>零干擾</span>
                        </span>
                      )}
                    </td>

                    {/* Result */}
                    <td className="px-5 py-3.5 text-dark-primary text-xs leading-relaxed">
                      {row.result || <span className="text-dark-muted italic">未填寫成果描述</span>}
                    </td>

                    {/* Timestamp */}
                    <td className="px-5 py-3.5 text-xs text-dark-muted whitespace-nowrap">
                      {formatTime(row.startTime)}
                    </td>

                    {/* Quick Actions */}
                    <td className="px-5 py-3.5 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleCopySingleJira(row)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                          isCopied
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-dark-base hover:bg-dark-hover border border-dark-border-subtle text-dark-muted hover:text-dark-primary'
                        }`}
                        title="複製此筆衝刺紀錄為 Jira Worklog 格式"
                      >
                        {isCopied ? '✓ 已複製' : '📋 複製 Jira'}
                      </button>
                    </td>
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
