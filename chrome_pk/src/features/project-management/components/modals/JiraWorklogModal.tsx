import React, { useState, useMemo } from 'react';
import { SprintLogWithMission } from '../tabs/types';

export interface JiraWorklogModalProps {
  isOpen: boolean;
  onClose: () => void;
  sprintLogs: SprintLogWithMission[];
}

export const JiraWorklogModal: React.FC<JiraWorklogModalProps> = ({
  isOpen,
  onClose,
  sprintLogs,
}) => {
  const [period, setPeriod] = useState<'thisWeek' | 'all'>('thisWeek');
  const [format, setFormat] = useState<'table' | 'tempo'>('table');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // 本週起訖時間計算
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

  const filteredLogs = useMemo(() => {
    if (period === 'all') return sprintLogs;
    const monTime = monday.getTime();
    const sunTime = sunday.getTime();
    return sprintLogs.filter((log) => log.startTime >= monTime && log.startTime <= sunTime);
  }, [sprintLogs, period, monday, sunday]);

  // 產生 Jira 格式文本
  const generatedText = useMemo(() => {
    if (filteredLogs.length === 0) {
      return '(選定週期內無衝刺工時紀錄)';
    }

    if (format === 'table') {
      // Jira Wiki Markup 表格格式
      const lines: string[] = [];
      lines.push(`h3. ⏱️ ScrumClock 衝刺工時日誌 (Jira Worklogs) - ${period === 'thisWeek' ? dateRangeStr : '全部紀錄'}`);
      lines.push('|| 日期時間 || 任務名稱 || 耗時 || 衝刺成果描述 || 中斷次數 || 關聯網址 ||');
      filteredLogs.forEach((l) => {
        const timeStr = new Date(l.startTime).toISOString().replace('T', ' ').substring(0, 16);
        const mins = Math.round((l.endTime - l.startTime) / 60000) || 25;
        const prio = l.priority ? `[${l.priority}] ` : '';
        const urlPart = l.missionUrl ? `[連結|${l.missionUrl}]` : '-';
        const resultText = (l.result || '專注衝刺完成').replace(/\|/g, '\\|');
        const intr = l.interruptionCount && l.interruptionCount > 0 ? `${l.interruptionCount} 次` : '0';
        lines.push(`| ${timeStr} | ${prio}${l.missionText} | ${mins}m | ${resultText} | ${intr} | ${urlPart} |`);
      });
      return lines.join('\n');
    } else {
      // Jira Tempo / 條列格式
      const lines: string[] = [];
      lines.push(`## ScrumClock Worklogs (${period === 'thisWeek' ? dateRangeStr : '全部紀錄'})`);
      filteredLogs.forEach((l) => {
        const timeStr = new Date(l.startTime).toISOString().replace('T', ' ').substring(0, 16);
        const mins = Math.round((l.endTime - l.startTime) / 60000) || 25;
        const prio = l.priority ? `[${l.priority}] ` : '';
        const intrText = l.interruptionCount && l.interruptionCount > 0 ? ` (中斷: ${l.interruptionCount}次)` : '';
        const urlText = l.missionUrl ? ` | URL: ${l.missionUrl}` : '';
        lines.push(`• [${timeStr}] ${prio}${l.missionText} (${mins}m) - ${l.result || '專注衝刺'}${intrText}${urlText}`);
      });
      return lines.join('\n');
    }
  }, [filteredLogs, format, period, dateRangeStr]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedText);
      setCopyFeedback('已複製 Jira Worklog 到剪貼簿！');
      setTimeout(() => setCopyFeedback(null), 3000);
    } catch (err) {
      console.error('複製失敗:', err);
      const ta = document.createElement('textarea');
      ta.value = generatedText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopyFeedback('已複製 Jira Worklog 到剪貼簿！');
      setTimeout(() => setCopyFeedback(null), 3000);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([generatedText], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().substring(0, 10);
    a.download = `jira_worklogs_${dateStr}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-dark-card border border-dark-border-default rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-dark-border-subtle flex items-center justify-between bg-dark-surface/80">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💼</span>
            <div>
              <h2 className="text-lg font-bold text-dark-primary flex items-center gap-2">
                Jira 工時拋轉 (Worklog Export)
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-mono border border-blue-500/30">
                  EF-03
                </span>
              </h2>
              <p className="text-xs text-dark-muted mt-0.5">
                支援 Jira Wiki Markup 表格與 Tempo 條列格式，一鍵快速貼入 Jira 任務日誌
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-dark-muted hover:text-dark-primary hover:bg-dark-hover p-1.5 rounded-lg transition-colors text-lg"
          >
            ✕
          </button>
        </div>

        {/* Toolbar Controls */}
        <div className="px-6 py-3 border-b border-dark-border-subtle bg-dark-base/40 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* 週期選擇 */}
            <div className="flex bg-dark-base rounded-lg p-0.5 border border-dark-border-subtle text-xs">
              <button
                onClick={() => setPeriod('thisWeek')}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  period === 'thisWeek'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-dark-muted hover:text-dark-primary'
                }`}
              >
                本週 ({filteredLogs.length})
              </button>
              <button
                onClick={() => setPeriod('all')}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  period === 'all'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-dark-muted hover:text-dark-primary'
                }`}
              >
                全部 ({sprintLogs.length})
              </button>
            </div>

            {/* 格式選擇 */}
            <div className="flex bg-dark-base rounded-lg p-0.5 border border-dark-border-subtle text-xs">
              <button
                onClick={() => setFormat('table')}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  format === 'table'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-dark-muted hover:text-dark-primary'
                }`}
              >
                Jira Wiki 表格語法
              </button>
              <button
                onClick={() => setFormat('tempo')}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  format === 'tempo'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-dark-muted hover:text-dark-primary'
                }`}
              >
                Tempo / 條列文字
              </button>
            </div>
          </div>

          {copyFeedback && (
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 animate-pulse">
              <span>✓</span> {copyFeedback}
            </span>
          )}
        </div>

        {/* Text Preview */}
        <div className="flex-1 p-6 overflow-y-auto">
          <pre className="bg-dark-base border border-dark-border-subtle rounded-xl p-4 font-mono text-xs text-dark-primary leading-relaxed whitespace-pre-wrap select-all max-h-[50vh] overflow-y-auto">
            {generatedText}
          </pre>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-dark-border-subtle bg-dark-surface flex items-center justify-between">
          <div className="text-xs text-dark-muted">
            共 {filteredLogs.length} 筆衝刺工時紀錄可拋轉
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDownload}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-dark-base hover:bg-dark-hover border border-dark-border-subtle text-dark-primary transition-all flex items-center gap-1.5"
            >
              <span>💾</span> 匯出 .txt
            </button>
            <button
              onClick={handleCopy}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all flex items-center gap-1.5"
            >
              <span>📋</span> 一鍵複製 Jira 語法
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
