import React, { useState, useEffect, useMemo } from 'react';
import { WeeklyMission } from '../../types';
import { SprintLogWithMission } from '../../features/project-management/components/tabs/types';

export interface StandupModalProps {
  isOpen: boolean;
  onClose: () => void;
  weeklyMissions: WeeklyMission[];
  inProgressIds: string[];
  sprintLogs?: SprintLogWithMission[];
}

export const StandupModal: React.FC<StandupModalProps> = ({
  isOpen,
  onClose,
  weeklyMissions,
  inProgressIds,
  sprintLogs = [],
}) => {
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [blockersInput, setBlockersInput] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'preview' | 'markdown'>('preview');

  // 計算昨日與今日日期字串 (YYYY-MM-DD)
  const { todayStr, yesterdayStr } = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const yest = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return { todayStr: today, yesterdayStr: yest };
  }, []);

  // 1. 自動彙整昨日/近期已完成任務
  const doneTasks = useMemo(() => {
    // 找出所有已標記為完成的任務
    const completed = weeklyMissions.filter((m) => m.isCompleted);
    // 統計每個任務的番茄鐘數
    const pomodoroMap: Record<string, number> = {};
    sprintLogs.forEach((log) => {
      pomodoroMap[log.missionId] = (pomodoroMap[log.missionId] || 0) + 1;
    });

    return completed.map((m) => ({
      id: m.id,
      text: m.text,
      notes: m.notes,
      priority: m.priority || 'P2',
      pomodoroCount: pomodoroMap[m.id] || 0,
      completedAt: m.completedAt,
    }));
  }, [weeklyMissions, sprintLogs]);

  // 2. 自動彙整今日進行中任務 (In-Progress / Focus)
  const inProgressTasks = useMemo(() => {
    const focusSet = new Set(inProgressIds);
    return weeklyMissions
      .filter((m) => !m.isCompleted && (focusSet.has(m.id) || m.gtdContext === '@Focus'))
      .map((m) => ({
        id: m.id,
        text: m.text,
        priority: m.priority || 'P2',
        notes: m.notes,
        estimatedPomodoros: m.estimatedPomodoros || 1,
      }));
  }, [weeklyMissions, inProgressIds]);

  // 3. 自動偵測現有 Blocked 任務
  const detectedBlockers = useMemo(() => {
    return weeklyMissions
      .filter((m) => !m.isCompleted && (m.gtdContext === '@Blocked' || m.notes?.toLowerCase().includes('block')))
      .map((m) => m.text + (m.notes ? ` (${m.notes})` : ''));
  }, [weeklyMissions]);

  // 初始化或合併 Blockers 文字
  useEffect(() => {
    if (detectedBlockers.length > 0 && !blockersInput) {
      setBlockersInput(detectedBlockers.join('\n'));
    }
  }, [detectedBlockers]);

  // 產生純文字 Markdown 格式
  const markdownText = useMemo(() => {
    const lines: string[] = [];
    lines.push(`### 📅 站會日誌 (Daily Standup) - ${todayStr}`);
    lines.push('');
    lines.push('#### ✅ 昨日產出 (Done)');
    if (doneTasks.length === 0) {
      lines.push('- (尚無完成項目，持續推進中)');
    } else {
      doneTasks.forEach((t) => {
        const tomo = t.pomodoroCount > 0 ? ` (🍅 ${t.pomodoroCount} 顆番茄)` : '';
        const note = t.notes ? ` — ${t.notes}` : '';
        lines.push(`- [x] [${t.priority}] ${t.text}${tomo}${note}`);
      });
    }

    lines.push('');
    lines.push('#### 🎯 今日焦點 (In-Progress / Focus)');
    if (inProgressTasks.length === 0) {
      lines.push('- (請從任務池挑選今日專注項目)');
    } else {
      inProgressTasks.forEach((t) => {
        const note = t.notes ? ` — ${t.notes}` : '';
        lines.push(`- [ ] [${t.priority}] ${t.text}${note}`);
      });
    }

    lines.push('');
    lines.push('#### 🚧 阻礙與協調 (Blockers & Impediments)');
    const blockers = blockersInput
      .split('\n')
      .map((b) => b.trim())
      .filter(Boolean);
    if (blockers.length === 0) {
      lines.push('- 無重大阻礙，進度符合預期');
    } else {
      blockers.forEach((b) => {
        lines.push(`- ⚠️ ${b}`);
      });
    }

    return lines.join('\n');
  }, [todayStr, doneTasks, inProgressTasks, blockersInput]);

  // 產生 HTML 富文本格式 (支援無縫貼入 Notion / Google Docs / Slack / Teams)
  const generateRichHtml = (): string => {
    let html = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1a1a1a;">`;
    html += `<h2 style="color: #2563eb; margin-bottom: 8px;">📅 站會日誌 (Daily Standup) - ${todayStr}</h2>`;

    html += `<h3 style="color: #059669; margin-top: 16px; margin-bottom: 6px;">✅ 昨日產出 (Done)</h3>`;
    if (doneTasks.length === 0) {
      html += `<p style="color: #6b7280; font-style: italic;">(尚無完成項目，持續推進中)</p>`;
    } else {
      html += `<ul style="margin-top: 4px; padding-left: 20px;">`;
      doneTasks.forEach((t) => {
        const tomo = t.pomodoroCount > 0 ? ` <span style="color: #ef4444; font-weight: bold;">(🍅 ${t.pomodoroCount} 顆番茄)</span>` : '';
        const note = t.notes ? ` <span style="color: #4b5563;">— ${escapeHtml(t.notes)}</span>` : '';
        html += `<li style="margin-bottom: 4px;"><span style="color: #10b981; font-weight: 600;">[x]</span> <strong>[${t.priority}]</strong> ${escapeHtml(t.text)}${tomo}${note}</li>`;
      });
      html += `</ul>`;
    }

    html += `<h3 style="color: #3b82f6; margin-top: 16px; margin-bottom: 6px;">🎯 今日焦點 (In-Progress / Focus)</h3>`;
    if (inProgressTasks.length === 0) {
      html += `<p style="color: #6b7280; font-style: italic;">(請從任務池挑選今日專注項目)</p>`;
    } else {
      html += `<ul style="margin-top: 4px; padding-left: 20px;">`;
      inProgressTasks.forEach((t) => {
        const note = t.notes ? ` <span style="color: #4b5563;">— ${escapeHtml(t.notes)}</span>` : '';
        html += `<li style="margin-bottom: 4px;"><span style="color: #3b82f6; font-weight: 600;">[ ]</span> <strong>[${t.priority}]</strong> ${escapeHtml(t.text)}${note}</li>`;
      });
      html += `</ul>`;
    }

    html += `<h3 style="color: #dc2626; margin-top: 16px; margin-bottom: 6px;">🚧 阻礙與協調 (Blockers & Impediments)</h3>`;
    const blockers = blockersInput
      .split('\n')
      .map((b) => b.trim())
      .filter(Boolean);
    if (blockers.length === 0) {
      html += `<p style="color: #10b981;">✔️ 無重大阻礙，進度符合預期</p>`;
    } else {
      html += `<ul style="margin-top: 4px; padding-left: 20px;">`;
      blockers.forEach((b) => {
        html += `<li style="margin-bottom: 4px; color: #dc2626;">⚠️ <strong>${escapeHtml(b)}</strong></li>`;
      });
      html += `</ul>`;
    }

    html += `</div>`;
    return html;
  };

  const escapeHtml = (str: string) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  // 一鍵複製 Markdown
  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(markdownText);
      setCopyFeedback('已複製 Markdown 至剪貼簿！');
      setTimeout(() => setCopyFeedback(null), 3000);
    } catch (e) {
      console.error('複製 Markdown 失敗:', e);
      setCopyFeedback('複製失敗，請手動選取文字');
    }
  };

  // 一鍵複製 HTML 富文本
  const handleCopyRichHtml = async () => {
    try {
      const htmlContent = generateRichHtml();
      if (typeof ClipboardItem !== 'undefined') {
        const blobHtml = new Blob([htmlContent], { type: 'text/html' });
        const blobText = new Blob([markdownText], { type: 'text/plain' });
        const clipboardItem = new ClipboardItem({
          'text/html': blobHtml,
          'text/plain': blobText,
        });
        await navigator.clipboard.write([clipboardItem]);
      } else {
        // Fallback for older environments
        await navigator.clipboard.writeText(markdownText);
      }
      setCopyFeedback('已複製 HTML 富文本 (可直接貼入 Docs/Notion/Slack)！');
      setTimeout(() => setCopyFeedback(null), 3000);
    } catch (e) {
      console.error('複製富文本失敗，降級為純文字:', e);
      try {
        await navigator.clipboard.writeText(markdownText);
        setCopyFeedback('已降級複製純文字 Markdown！');
        setTimeout(() => setCopyFeedback(null), 3000);
      } catch (err) {
        setCopyFeedback('複製失敗');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-gray-900 border border-gray-700/80 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-gray-100">
        {/* Modal 頂部 Header */}
        <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-gray-950/60">
          <div className="flex items-center gap-3">
            <span className="text-2xl p-2 bg-blue-950/60 border border-blue-800/40 rounded-xl">📢</span>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                站會 Copilot (Standup Generator)
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold border border-blue-400/30">
                  純前端極簡
                </span>
              </h2>
              <p className="text-xs text-gray-400">一鍵彙整 Done / Focus / Blockers，支援 Markdown 與富文本導出</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition-colors"
            title="關閉"
          >
            ✕
          </button>
        </div>

        {/* 複製成功提示 Toast */}
        {copyFeedback && (
          <div className="bg-emerald-900/90 text-emerald-200 border-b border-emerald-700 px-6 py-2.5 text-xs font-semibold flex items-center gap-2 animate-pulse">
            <span>✨</span>
            <span>{copyFeedback}</span>
          </div>
        )}

        {/* Modal 內容區 */}
        <div className="p-6 flex-1 overflow-y-auto space-y-5">
          {/* 視圖切換 Tab */}
          <div className="flex items-center justify-between">
            <div className="flex bg-gray-950 p-1 rounded-xl border border-gray-800">
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'preview'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                結構預覽 (Preview)
              </button>
              <button
                onClick={() => setActiveTab('markdown')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'markdown'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                原始 Markdown
              </button>
            </div>

            <div className="text-xs text-gray-400 flex items-center gap-2">
              <span>📅 日期: {todayStr}</span>
            </div>
          </div>

          {activeTab === 'preview' ? (
            <div className="space-y-4">
              {/* 昨日產出卡片 */}
              <div className="bg-gray-950/70 border border-emerald-900/40 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                    <span>✅</span> 昨日/近期完成 ({doneTasks.length})
                  </h4>
                </div>
                {doneTasks.length === 0 ? (
                  <p className="text-xs text-gray-500 italic py-1">尚無完成項目，衝刺後將自動列入。</p>
                ) : (
                  <ul className="space-y-1.5 text-xs text-gray-300">
                    {doneTasks.map((t) => (
                      <li key={t.id} className="flex items-start gap-2 bg-gray-900/60 p-2 rounded-lg border border-gray-800">
                        <span className="text-emerald-400 font-bold">✔</span>
                        <div className="flex-1">
                          <span className="font-medium text-white">{t.text}</span>
                          {t.pomodoroCount > 0 && (
                            <span className="ml-2 text-rose-400 font-semibold">
                              🍅 {t.pomodoroCount} 顆
                            </span>
                          )}
                          {t.notes && <p className="text-gray-400 text-[11px] mt-0.5">{t.notes}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* 今日焦點卡片 */}
              <div className="bg-gray-950/70 border border-blue-900/40 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-blue-400 flex items-center gap-2">
                    <span>🎯</span> 今日焦點 (In-Progress / Focus) ({inProgressTasks.length})
                  </h4>
                </div>
                {inProgressTasks.length === 0 ? (
                  <p className="text-xs text-gray-500 italic py-1">今日尚無指派焦點任務，可從任務池「🎯 推入今日」。</p>
                ) : (
                  <ul className="space-y-1.5 text-xs text-gray-300">
                    {inProgressTasks.map((t) => (
                      <li key={t.id} className="flex items-start gap-2 bg-gray-900/60 p-2 rounded-lg border border-gray-800">
                        <span className="text-blue-400 font-bold">▶</span>
                        <div className="flex-1">
                          <span className="font-medium text-white">{t.text}</span>
                          <span className="ml-2 px-1.5 py-0.5 text-[10px] rounded bg-gray-800 text-gray-300 border border-gray-700">
                            {t.priority}
                          </span>
                          {t.notes && <p className="text-gray-400 text-[11px] mt-0.5">{t.notes}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* 阻礙事項自訂編輯 */}
              <div className="bg-gray-950/70 border border-rose-900/40 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-rose-400 flex items-center gap-2">
                    <span>🚧</span> 阻礙與協助 (Blockers)
                  </h4>
                  <span className="text-[11px] text-gray-400">一行一項，留空即表示無阻礙</span>
                </div>
                <textarea
                  value={blockersInput}
                  onChange={(e) => setBlockersInput(e.target.value)}
                  placeholder="例如：等待後端 API 上線 / 第三方 OAuth 審核中..."
                  rows={2}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-rose-500 transition-colors resize-none"
                />
              </div>
            </div>
          ) : (
            <div className="relative">
              <pre className="w-full bg-gray-950 border border-gray-800 rounded-xl p-4 text-xs font-mono text-gray-300 whitespace-pre-wrap max-h-96 overflow-y-auto leading-relaxed">
                {markdownText}
              </pre>
            </div>
          )}
        </div>

        {/* Modal 底部操作按鈕 */}
        <div className="px-6 py-4 border-t border-gray-800 bg-gray-950/70 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-gray-500">
            支援貼入 Notion, Google Docs, Slack, Gmail
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyMarkdown}
              className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold text-xs border border-gray-700 transition-all flex items-center gap-2 active:scale-95"
            >
              <span>📋</span>
              <span>複製 Markdown</span>
            </button>
            <button
              onClick={handleCopyRichHtml}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2 active:scale-95"
            >
              <span>📄</span>
              <span>複製 HTML 富文本</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
