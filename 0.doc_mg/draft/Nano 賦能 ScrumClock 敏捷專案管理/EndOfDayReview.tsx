import React, { useState, useEffect } from 'react';
import { WeeklyMission } from '@/features/project-management/types';
import { TaskAIEngine } from '@/features/project-management/services/taskAIEngine';

export interface EndOfDayReviewProps {
  isOpen: boolean;
  onClose: () => void;
  completedTasks: WeeklyMission[];
  totalSpentPomodoros: number;
  onSaveReviewLog?: (reviewData: {
    date: string;
    highlights: string;
    lessons: string;
    nextAction: string;
    aiDigest: string;
  }) => Promise<void> | void;
}

const LOCAL_GATEWAY = 'http://127.0.0.1:8765/exec';

export const EndOfDayReview: React.FC<EndOfDayReviewProps> = ({
  isOpen,
  onClose,
  completedTasks = [],
  totalSpentPomodoros = 0,
  onSaveReviewLog,
}) => {
  const [highlights, setHighlights] = useState('');
  const [lessons, setLessons] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [aiDigest, setAiDigest] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'info' | 'success' | 'error'; text: string } | null>(null);

  const aiEngine = TaskAIEngine.getInstance();

  useEffect(() => {
    if (isOpen) {
      setStatusMessage(null);
      // 自動推薦明日第一行動 (取未完成的第一項)
      if (!nextAction && completedTasks.length > 0) {
        setNextAction(`延續專注動能：深化覆盤與落實後續交付`);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGenerateDigest = async () => {
    setIsGenerating(true);
    setStatusMessage({ type: 'info', text: '⚡ Gemini Nano (ai.summarizer) 正在提煉今日戰役 High-Signal 摘要...' });

    try {
      const summary = await aiEngine.generateDailyReviewSummary(
        completedTasks,
        totalSpentPomodoros,
        {
          highlights: highlights.trim() || undefined,
          lessons: lessons.trim() || undefined,
        }
      );
      setAiDigest(summary);
      setStatusMessage({ type: 'success', text: '✨ Nano 今日戰報提煉完成！' });
    } catch (err: any) {
      console.error('[EndOfDayReview] 生成摘要失敗:', err);
      setStatusMessage({ type: 'error', text: `生成戰報失敗: ${err?.message || '未知錯誤'}` });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleArchiveToObsidian = async () => {
    if (!aiDigest && !highlights && completedTasks.length === 0) {
      setStatusMessage({ type: 'error', text: '請至少填寫亮點或生成 AI 戰報後再進行歸檔' });
      return;
    }

    setIsArchiving(true);
    setStatusMessage({ type: 'info', text: '正在寫入本地 Obsidian 筆記庫 (clippings)...' });

    const todayStr = new Date().toISOString().split('T')[0];
    const markdownContent = `
# 🍅 ScrumClock 每日敏捷戰報 (${todayStr})

> 總專注時長: **${totalSpentPomodoros * 25} 分鐘** (${totalSpentPomodoros} 個番茄鐘)  
> 圓滿達成戰役: **${completedTasks.length}** 項

---

## 🎯 核心產出與亮點 (Highlights)
${highlights.trim() ? highlights : '今日以平穩節奏推進核心任務。'}

## 💡 踩坑教訓與時間黑洞 (Lessons Learned)
${lessons.trim() ? lessons : '心流專注平穩，無顯著阻礙。'}

## ⚡ 明日第一戰役 (Tomorrow's Priority)
${nextAction.trim() ? nextAction : '檢視看板收件匣，啟動新一輪衝刺。'}

---

## 🤖 Gemini Nano 戰力復盤摘要
${aiDigest || '（未產出 AI 戰報）'}

---

## 📋 落地任務細項
${completedTasks.map((t) => `- [x] ${t.title} (實耗: ${t.spentPomodoros || 1}🍅)`).join('\n')}
`.trim();

    try {
      const res = await fetch(LOCAL_GATEWAY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool_name: 'save_markdown',
          payload: {
            title: `Daily-Sprint-${todayStr}`,
            content: markdownContent,
            url: 'scrumclock://daily-review',
            tags: ['ScrumClock', 'DailyReview', 'Pomodoro', 'Productivity'],
          },
        }),
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setStatusMessage({ type: 'success', text: `✅ 筆記已成功落盤至本地: ${data.filename}` });
      } else {
        setStatusMessage({ type: 'error', text: `本機歸檔失敗: ${data.message || '未知錯誤'}` });
      }
    } catch (_err) {
      setStatusMessage({
        type: 'error',
        text: '無法連線至本地微服務 (127.0.0.1:8765)，請確認 main_dispatcher.py 是否執行中',
      });
    } finally {
      setIsArchiving(false);
    }
  };

  const handleCompleteAndSave = async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (onSaveReviewLog) {
      await onSaveReviewLog({
        date: todayStr,
        highlights: highlights.trim(),
        lessons: lessons.trim(),
        nextAction: nextAction.trim(),
        aiDigest: aiDigest.trim(),
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200 select-none">
      <div className="relative flex flex-col w-full max-w-2xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* 頂部標題 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">🌅</span>
            <div>
              <h2 className="text-base font-bold text-slate-100 font-mono tracking-wide flex items-center gap-2">
                日終敏捷成果回顧 (End of Day Review)
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                  {totalSpentPomodoros}🍅 達成
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                覆盤今日專注心流，由 Gemini Nano 萃取核心洞察，為明日鎖定第一戰役。
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 狀態反饋條 */}
        {statusMessage && (
          <div
            className={`mx-6 mt-3 px-3 py-2 rounded-lg text-xs font-mono flex items-center justify-between ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300'
                : statusMessage.type === 'error'
                ? 'bg-rose-950/80 border border-rose-800 text-rose-300'
                : 'bg-indigo-950/80 border border-indigo-800 text-indigo-300'
            }`}
          >
            <span>{statusMessage.text}</span>
            <button
              onClick={() => setStatusMessage(null)}
              className="ml-2 hover:opacity-75"
            >
              ✕
            </button>
          </div>
        )}

        {}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          
          {/* 今日成果簡報橫幅 */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800/90 text-xs">
            <div>
              <span className="text-slate-500 font-mono">今日投入時長</span>
              <div className="text-base font-bold text-slate-200 font-mono pt-0.5">
                {totalSpentPomodoros} 個番茄鐘 ({totalSpentPomodoros * 25}m)
              </div>
            </div>
            <div>
              <span className="text-slate-500 font-mono">圓滿落地戰役</span>
              <div className="text-base font-bold text-emerald-400 font-mono pt-0.5">
                {completedTasks.length} 項任務已完成
              </div>
            </div>
          </div>

          {/* 今日亮點 Highlight */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <span>🌟 今日最大戰功與產出 (Highlight)</span>
            </label>
            <textarea
              value={highlights}
              onChange={(e) => setHighlights(e.target.value)}
              rows={2}
              placeholder="例如：完成 Gemini Nano 專用適配器重構，比原估時間節省 1 個番茄鐘..."
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-sans"
            />
          </div>

          {/* 阻礙與踩坑 Lesson */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <span>🕳️ 時間黑洞與教訓反思 (Lesson Learned)</span>
            </label>
            <textarea
              value={lessons}
              onChange={(e) => setLessons(e.target.value)}
              rows={2}
              placeholder="例如：除錯 CORS 問題原估 1🍅 實耗 3🍅，未來遇到微服務端口問題應先確認中介層..."
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-sans"
            />
          </div>

          {/* 明日第一戰役 Next Action */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <span>⚡ 明日核心戰役 (Tomorrow's Priority)</span>
            </label>
            <input
              type="text"
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              placeholder="例如：啟動 Kanban 背景閒置巡檢守護實作..."
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-sans"
            />
          </div>

          {}
          <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/60 via-slate-950 to-sky-950/40 border border-indigo-800/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-base">✨</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-100">
                    Gemini Nano 智能日報提煉 (Key-Points Mode)
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    由 <code>ai.summarizer</code> 動態提煉客觀戰力數據與敏捷反思報告。
                  </p>
                </div>
              </div>
              <button
                onClick={handleGenerateDigest}
                disabled={isGenerating}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold rounded-lg shadow transition-all active:scale-98 flex items-center space-x-1 shrink-0"
              >
                {isGenerating ? (
                  <span className="animate-pulse">Nano 萃取中...</span>
                ) : (
                  <span>⚡ 一鍵提煉戰報</span>
                )}
              </button>
            </div>

            {aiDigest && (
              <div className="pt-2 border-t border-indigo-900/60 space-y-2 animate-in fade-in duration-200">
                <textarea
                  value={aiDigest}
                  onChange={(e) => setAiDigest(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono leading-relaxed"
                />
              </div>
            )}
          </div>
        </div>

        {}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <button
            onClick={handleArchiveToObsidian}
            disabled={isArchiving}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 hover:text-white text-xs font-medium rounded-lg border border-slate-700 transition-colors flex items-center space-x-1.5"
            title="將戰報與任務寫入本地 Obsidian / Markdown 筆記庫"
          >
            <span>📰 {isArchiving ? '正在歸檔...' : '歸檔至 Obsidian'}</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
            >
              稍後回顧
            </button>
            <button
              onClick={handleCompleteAndSave}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-md shadow-emerald-950/40 transition-all active:scale-98"
            >
              ✅ 完成結算下班
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};