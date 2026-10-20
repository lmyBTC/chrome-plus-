import React, { useState, useMemo } from 'react';
import { SprintLogWithMission } from '../tabs/types';
import { WeeklyMission } from '../../../../types';

export interface WeeklyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sprintLogs: SprintLogWithMission[];
  weeklyMissions?: WeeklyMission[];
}

export const WeeklyReportModal: React.FC<WeeklyReportModalProps> = ({
  isOpen,
  onClose,
  sprintLogs,
  weeklyMissions = [],
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'markdown'>('preview');
  const [period, setPeriod] = useState<'thisWeek' | 'all'>('thisWeek');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // 本週起訖時間計算 (週一 00:00:00 ~ 週日 23:59:59)
  const { monday, sunday, dateRangeStr } = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const mon = new Date(now);
    mon.setDate(now.getDate() + diffToMonday);
    mon.setHours(0, 0, 0, 0);

    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    sun.setHours(23, 59, 59, 999);

    const fmt = (d: Date) => d.toISOString().split('T')[0];
    return {
      monday: mon,
      sunday: sun,
      dateRangeStr: `${fmt(mon)} ~ ${fmt(sun)}`,
    };
  }, []);

  // 依選定週期篩選衝刺日誌
  const filteredLogs = useMemo(() => {
    if (period === 'all') return sprintLogs;
    const monTime = monday.getTime();
    const sunTime = sunday.getTime();
    return sprintLogs.filter((log) => log.startTime >= monTime && log.startTime <= sunTime);
  }, [sprintLogs, period, monday, sunday]);

  // 度量數據計算
  const metrics = useMemo(() => {
    const totalSprints = filteredLogs.length;
    let totalMinutes = 0;
    let totalInterruptions = 0;
    let cleanSprintsCount = 0;
    const interruptionReasonsMap: Record<string, number> = {};

    filteredLogs.forEach((log) => {
      const mins = Math.round((log.endTime - log.startTime) / 60000) || 25;
      totalMinutes += mins;

      const interrupts = log.interruptionCount || 0;
      totalInterruptions += interrupts;
      if (interrupts === 0) {
        cleanSprintsCount += 1;
      }

      if (log.interruptionReasons && log.interruptionReasons.length > 0) {
        log.interruptionReasons.forEach((reason) => {
          interruptionReasonsMap[reason] = (interruptionReasonsMap[reason] || 0) + 1;
        });
      }
    });

    const totalHours = (totalMinutes / 60).toFixed(1);
    const cleanSprintRate = totalSprints > 0 ? Math.round((cleanSprintsCount / totalSprints) * 100) : 100;

    // 任務達成情況
    const completedTasks = weeklyMissions.filter((m) => m.isCompleted);
    const inProgressTasks = weeklyMissions.filter((m) => !m.isCompleted);
    const totalTasks = weeklyMissions.length;
    const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

    return {
      totalSprints,
      totalMinutes,
      totalHours,
      totalInterruptions,
      cleanSprintsCount,
      cleanSprintRate,
      interruptionReasonsMap,
      completedTasks,
      inProgressTasks,
      totalTasks,
      taskCompletionRate,
    };
  }, [filteredLogs, weeklyMissions]);

  // 格式化輸出 Markdown
  const markdownContent = useMemo(() => {
    const lines: string[] = [];
    lines.push(`# 🚀 敏捷衝刺週報 (Agile Sprint Weekly Report)`);
    lines.push(`> **統計週期**：${period === 'thisWeek' ? dateRangeStr : '全部累積歷史紀錄'}`);
    lines.push(`> **產出時間**：${new Date().toISOString().replace('T', ' ').substring(0, 19)}`);
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## 📊 核心度量 (Metrics Overview)');
    lines.push(`- **🎯 任務達成率**：${metrics.taskCompletionRate}% (${metrics.completedTasks.length}/${metrics.totalTasks} 項任務已完成)`);
    lines.push(`- **🍅 總專注番茄鐘**：${metrics.totalSprints} 顆 (~${metrics.totalHours} 小時 / ${metrics.totalMinutes} 分鐘)`);
    lines.push(`- **🛡️ 衝刺專注率**：${metrics.cleanSprintRate}% (${metrics.cleanSprintsCount}/${metrics.totalSprints} 次衝刺零干擾)`);
    lines.push(`- **⚠️ 外部打擾次數**：共 ${metrics.totalInterruptions} 次中斷`);

    const reasons = Object.entries(metrics.interruptionReasonsMap);
    if (reasons.length > 0) {
      lines.push(`  - *中斷原因分佈*：${reasons.map(([r, c]) => `${r} (${c}次)`).join('、')}`);
    }

    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## ✅ 本週交付成果 (Completed Deliverables)');
    if (metrics.completedTasks.length === 0) {
      lines.push('- *(尚無標記完成之項目，請持續衝刺推進)*');
    } else {
      metrics.completedTasks.forEach((t) => {
        const prio = t.priority ? `[${t.priority}] ` : '';
        const spent = t.spentPomodoros ? ` (🍅 耗時 ${t.spentPomodoros} 顆)` : '';
        const note = t.notes ? ` — ${t.notes}` : '';
        const url = t.url ? ` [🔗 連結](${t.url})` : '';
        lines.push(`- [x] ${prio}**${t.text}**${spent}${note}${url}`);
      });
    }

    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## ⏳ 推進中項目 (In-Progress & Next Actions)');
    if (metrics.inProgressTasks.length === 0) {
      lines.push('- *(目前無進行中項目)*');
    } else {
      metrics.inProgressTasks.forEach((t) => {
        const prio = t.priority ? `[${t.priority}] ` : '';
        const est = t.estimatedPomodoros ? ` (預估 🍅 ${t.estimatedPomodoros} 顆)` : '';
        const spent = t.spentPomodoros ? ` (已耗 🍅 ${t.spentPomodoros} 顆)` : '';
        const note = t.notes ? ` — ${t.notes}` : '';
        lines.push(`- [ ] ${prio}**${t.text}**${est}${spent}${note}`);
      });
    }

    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## ⏱️ 番茄鐘衝刺詳細日誌 (Sprint Logs)');
    if (filteredLogs.length === 0) {
      lines.push('- *(本週期內尚無衝刺日誌)*');
    } else {
      lines.push('| 時間 | 任務名稱 | 耗時 | 衝刺成果描述 | 中斷 |');
      lines.push('| :--- | :--- | :--- | :--- | :--- |');
      filteredLogs.forEach((l) => {
        const timeStr = new Date(l.startTime).toISOString().replace('T', ' ').substring(0, 16);
        const mins = Math.round((l.endTime - l.startTime) / 60000) || 25;
        const intr = l.interruptionCount && l.interruptionCount > 0 ? `⚠️ ${l.interruptionCount}次` : '✅ 0次';
        lines.push(`| ${timeStr} | ${l.missionText} | ${mins}m | ${l.result || '完成專注衝刺'} | ${intr} |`);
      });
    }

    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## 💡 敏捷復盤觀察 (Sprint Retrospective)');
    lines.push(`- **團隊亮點**：本週期累計投入 ${metrics.totalSprints} 顆高強度番茄鐘，任務推進率達到 ${metrics.taskCompletionRate}%。`);
    if (metrics.totalInterruptions > 0) {
      lines.push(`- **摩擦防護**：記錄到 ${metrics.totalInterruptions} 次衝刺中斷，建議於行事曆設定專注防護時段，以降低上下文切換損耗。`);
    } else {
      lines.push(`- **專注狀態**：本週期保持 100% 零外部干擾，時間箱推進節奏優秀。`);
    }

    return lines.join('\n');
  }, [period, dateRangeStr, metrics, filteredLogs]);

  // 一鍵複製 Markdown
  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(markdownContent);
      setCopyFeedback('已成功複製 Markdown 週報！');
      setTimeout(() => setCopyFeedback(null), 3000);
    } catch (err) {
      console.error('複製失敗:', err);
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = markdownContent;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopyFeedback('已成功複製 Markdown 週報！');
      setTimeout(() => setCopyFeedback(null), 3000);
    }
  };

  // 下載 Markdown 檔案
  const handleDownloadMarkdown = () => {
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().substring(0, 10);
    a.download = `agile_weekly_report_${dateStr}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-dark-card border border-dark-border-default rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-dark-border-subtle flex items-center justify-between bg-dark-surface/80">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📋</span>
            <div>
              <h2 className="text-lg font-bold text-dark-primary flex items-center gap-2">
                敏捷衝刺週報產生器
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 font-mono border border-indigo-500/30">
                  SC-V02
                </span>
              </h2>
              <p className="text-xs text-dark-muted mt-0.5">
                自動聚合本週已完成任務、總耗損番茄鐘、衝刺達成率與中斷次數
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* 週期選擇 */}
            <div className="flex bg-dark-base rounded-lg p-0.5 border border-dark-border-subtle text-xs">
              <button
                onClick={() => setPeriod('thisWeek')}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  period === 'thisWeek'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-dark-muted hover:text-dark-primary'
                }`}
              >
                本週 ({dateRangeStr.split(' ~ ')[0].substring(5)})
              </button>
              <button
                onClick={() => setPeriod('all')}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  period === 'all'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-dark-muted hover:text-dark-primary'
                }`}
              >
                全部紀錄
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-dark-muted hover:text-dark-primary hover:bg-dark-hover p-1.5 rounded-lg transition-colors text-lg"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab Switcher & Feedback Bar */}
        <div className="px-6 py-3 border-b border-dark-border-subtle bg-dark-base/40 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'preview'
                  ? 'bg-dark-surface text-indigo-400 border border-indigo-500/30 shadow-sm'
                  : 'text-dark-muted hover:text-dark-primary'
              }`}
            >
              <span>📊</span> 視覺化指標預覽
            </button>
            <button
              onClick={() => setActiveTab('markdown')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'markdown'
                  ? 'bg-dark-surface text-indigo-400 border border-indigo-500/30 shadow-sm'
                  : 'text-dark-muted hover:text-dark-primary'
              }`}
            >
              <span>📝</span> Markdown 原始碼
            </button>
          </div>

          {copyFeedback && (
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 animate-pulse">
              <span>✓</span> {copyFeedback}
            </span>
          )}
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'preview' ? (
            <>
              {/* Metrics Cards */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-dark-surface/60 border border-dark-border-subtle rounded-xl p-4">
                  <div className="text-xs font-medium text-dark-muted mb-1 flex items-center gap-1">
                    <span>🎯</span> 任務達成率
                  </div>
                  <div className="text-2xl font-bold text-dark-primary">
                    {metrics.taskCompletionRate}%
                  </div>
                  <div className="text-xs text-dark-secondary mt-1">
                    已交付 {metrics.completedTasks.length} / 共 {metrics.totalTasks} 項任務
                  </div>
                </div>

                <div className="bg-dark-surface/60 border border-dark-border-subtle rounded-xl p-4">
                  <div className="text-xs font-medium text-dark-muted mb-1 flex items-center gap-1">
                    <span>🍅</span> 總番茄工時
                  </div>
                  <div className="text-2xl font-bold text-indigo-400">
                    {metrics.totalSprints} 顆
                  </div>
                  <div className="text-xs text-dark-secondary mt-1">
                    約 {metrics.totalHours} 小時 ({metrics.totalMinutes} 分鐘)
                  </div>
                </div>

                <div className="bg-dark-surface/60 border border-dark-border-subtle rounded-xl p-4">
                  <div className="text-xs font-medium text-dark-muted mb-1 flex items-center gap-1">
                    <span>🛡️</span> 衝刺專注率
                  </div>
                  <div className="text-2xl font-bold text-emerald-400">
                    {metrics.cleanSprintRate}%
                  </div>
                  <div className="text-xs text-dark-secondary mt-1">
                    {metrics.cleanSprintsCount} / {metrics.totalSprints} 次衝刺零干擾
                  </div>
                </div>

                <div className="bg-dark-surface/60 border border-dark-border-subtle rounded-xl p-4">
                  <div className="text-xs font-medium text-dark-muted mb-1 flex items-center gap-1">
                    <span>⚠️</span> 累積中斷次數
                  </div>
                  <div className="text-2xl font-bold text-amber-400">
                    {metrics.totalInterruptions} 次
                  </div>
                  <div className="text-xs text-dark-secondary mt-1 truncate" title={Object.keys(metrics.interruptionReasonsMap).join(', ')}>
                    {Object.keys(metrics.interruptionReasonsMap).length > 0
                      ? Object.entries(metrics.interruptionReasonsMap).map(([r, c]) => `${r}×${c}`).join(' ')
                      : '無外部打擾'}
                  </div>
                </div>
              </div>

              {/* Completed Tasks Deliverables */}
              <div className="bg-dark-surface/40 border border-dark-border-subtle rounded-xl p-5">
                <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2 mb-3">
                  <span>✅</span> 本週交付成果 ({metrics.completedTasks.length})
                </h3>
                {metrics.completedTasks.length === 0 ? (
                  <p className="text-xs text-dark-muted italic">尚無已標記完成之任務</p>
                ) : (
                  <div className="space-y-2">
                    {metrics.completedTasks.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-dark-base/60 border border-dark-border-subtle/50"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-400 font-bold">✓</span>
                          {t.priority && (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                t.priority === 'P0'
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  : t.priority === 'P1'
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : 'bg-blue-500/20 text-blue-400'
                              }`}
                            >
                              {t.priority}
                            </span>
                          )}
                          <span className="font-medium text-dark-primary">{t.text}</span>
                          {t.notes && <span className="text-dark-muted">— {t.notes}</span>}
                        </div>
                        <div className="flex items-center gap-2 text-dark-muted">
                          {t.spentPomodoros && <span>🍅 {t.spentPomodoros}</span>}
                          {t.url && (
                            <a
                              href={t.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-400 hover:underline"
                            >
                              🔗
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* In-Progress Tasks */}
              <div className="bg-dark-surface/40 border border-dark-border-subtle rounded-xl p-5">
                <h3 className="text-sm font-bold text-indigo-400 flex items-center gap-2 mb-3">
                  <span>⏳</span> 推進中任務與 Backlog ({metrics.inProgressTasks.length})
                </h3>
                {metrics.inProgressTasks.length === 0 ? (
                  <p className="text-xs text-dark-muted italic">無推進中任務</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {metrics.inProgressTasks.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-dark-base/60 border border-dark-border-subtle/50"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-dark-muted">○</span>
                          {t.priority && (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                t.priority === 'P0'
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  : 'bg-blue-500/20 text-blue-400'
                              }`}
                            >
                              {t.priority}
                            </span>
                          )}
                          <span className="font-medium text-dark-primary">{t.text}</span>
                        </div>
                        <div className="text-dark-muted flex items-center gap-2">
                          {t.estimatedPomodoros && <span>預估 🍅 {t.estimatedPomodoros}</span>}
                          {t.spentPomodoros ? <span>(已耗 {t.spentPomodoros})</span> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Sprints Overview */}
              <div className="bg-dark-surface/40 border border-dark-border-subtle rounded-xl p-5">
                <h3 className="text-sm font-bold text-dark-primary flex items-center gap-2 mb-3">
                  <span>⏱️</span> 衝刺工作日誌 ({filteredLogs.length} 筆)
                </h3>
                {filteredLogs.length === 0 ? (
                  <p className="text-xs text-dark-muted italic">目前無衝刺日誌紀錄</p>
                ) : (
                  <div className="overflow-x-auto max-h-56">
                    <table className="w-full text-left text-xs text-dark-secondary">
                      <thead className="bg-dark-base/80 text-dark-muted uppercase font-semibold">
                        <tr>
                          <th className="px-3 py-2">任務</th>
                          <th className="px-3 py-2">耗時</th>
                          <th className="px-3 py-2">成果描述</th>
                          <th className="px-3 py-2">中斷次數</th>
                          <th className="px-3 py-2">時間</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dark-border-subtle">
                        {filteredLogs.slice(0, 10).map((l) => (
                          <tr key={l.sprintId}>
                            <td className="px-3 py-2 font-medium text-dark-primary">{l.missionText}</td>
                            <td className="px-3 py-2">{Math.round((l.endTime - l.startTime) / 60000) || 25}m</td>
                            <td className="px-3 py-2 truncate max-w-[200px]">{l.result || '已完成衝刺'}</td>
                            <td className="px-3 py-2">
                              {l.interruptionCount && l.interruptionCount > 0 ? (
                                <span className="text-amber-400 font-semibold">⚠️ {l.interruptionCount}次</span>
                              ) : (
                                <span className="text-emerald-400">零中斷</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-dark-muted">
                              {new Date(l.startTime).toISOString().replace('T', ' ').substring(5, 16)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Markdown Raw View */
            <div className="relative">
              <pre className="bg-dark-base border border-dark-border-subtle rounded-xl p-5 font-mono text-xs text-dark-primary leading-relaxed whitespace-pre-wrap select-all max-h-[60vh] overflow-y-auto">
                {markdownContent}
              </pre>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-dark-border-subtle bg-dark-surface flex items-center justify-between">
          <div className="text-xs text-dark-muted">
            已聚合 {metrics.totalSprints} 顆番茄日誌與 {metrics.totalTasks} 項任務資料
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadMarkdown}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-dark-base hover:bg-dark-hover border border-dark-border-subtle text-dark-primary transition-all flex items-center gap-1.5"
            >
              <span>💾</span> 下載 .md 檔案
            </button>
            <button
              onClick={handleCopyMarkdown}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-1.5"
            >
              <span>📋</span> 一鍵複製 Markdown
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
