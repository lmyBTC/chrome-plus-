import React from 'react';
import { GoogleCalendarEvent } from '../../../../shared/google/googleTypes';

interface CalendarConflictModalProps {
  isOpen: boolean;
  conflictEvent: GoogleCalendarEvent | null;
  targetDurationMinutes: number;
  suggestedDurationMinutes: number;
  onConfirmAdjusted: (adjustedMinutes: number) => void;
  onProceedAnyway: () => void;
  onCancel: () => void;
}

export const CalendarConflictModal: React.FC<CalendarConflictModalProps> = ({
  isOpen,
  conflictEvent,
  targetDurationMinutes,
  suggestedDurationMinutes,
  onConfirmAdjusted,
  onProceedAnyway,
  onCancel,
}) => {
  if (!isOpen || !conflictEvent) return null;

  const formatEventTime = (dateTimeStr?: string) => {
    if (!dateTimeStr) return '';
    try {
      const d = new Date(dateTimeStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return dateTimeStr;
    }
  };

  const startTimeStr = formatEventTime(conflictEvent.start?.dateTime);
  const endTimeStr = formatEventTime(conflictEvent.end?.dateTime);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in p-4">
      <div className="bg-dark-card border border-amber-500/40 rounded-xl p-6 max-w-md w-full shadow-2xl shadow-amber-950/30">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl shrink-0">
            ⚠️
          </div>
          <div>
            <h3 className="text-lg font-bold text-dark-primary">日曆會議防撞預警</h3>
            <p className="text-xs text-amber-400 font-medium">即將與既定行事曆行程重疊</p>
          </div>
        </div>

        {/* 衝突會議資訊卡 */}
        <div className="bg-dark-surface border border-dark-border-subtle rounded-lg p-3.5 mb-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-dark-secondary">
            <span className="font-medium text-dark-muted">衝突行程</span>
            <span className="text-amber-300 font-mono font-semibold">
              {startTimeStr} - {endTimeStr}
            </span>
          </div>
          <div className="text-sm font-semibold text-slate-100 truncate" title={conflictEvent.summary}>
            📅 {conflictEvent.summary || '未命名會議'}
          </div>
          <div className="text-xs text-dark-secondary leading-relaxed pt-1 border-t border-dark-border-subtle">
            原定衝刺時長為 <strong className="text-blue-400">{targetDurationMinutes} 分鐘</strong>，可能在中途遭遇會議打斷，建議改用短衝刺確保專注閉環。
          </div>
        </div>

        {/* 決策按鈕組 */}
        <div className="space-y-2.5">
          <button
            onClick={() => onConfirmAdjusted(suggestedDurationMinutes)}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-semibold rounded-lg shadow-lg shadow-amber-950/40 transition-all text-sm flex items-center justify-center space-x-2 cursor-pointer"
          >
            <span>⚡ 改用 {suggestedDurationMinutes} 分鐘衝刺 (推薦防撞)</span>
          </button>

          <button
            onClick={onProceedAnyway}
            className="w-full py-2 px-4 bg-dark-hover hover:bg-dark-card border border-dark-border-default text-dark-secondary hover:text-dark-primary font-medium rounded-lg transition-colors text-sm flex items-center justify-center space-x-2 cursor-pointer"
          >
            <span>仍以 {targetDurationMinutes} 分鐘強制開始</span>
          </button>

          <button
            onClick={onCancel}
            className="w-full py-1.5 px-4 text-xs text-dark-muted hover:text-dark-secondary transition-colors text-center cursor-pointer"
          >
            取消衝刺
          </button>
        </div>
      </div>
    </div>
  );
};
