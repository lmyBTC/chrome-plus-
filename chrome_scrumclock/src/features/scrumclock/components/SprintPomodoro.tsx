import React, { useState, useEffect } from 'react';
import { useTimer } from '../contexts/TimerContext';
import { storage } from '../../../core/chrome/storage';
import { CoreBattle, WeeklyMission } from '../../../types';
import { sync } from '../../../core/api/sync';
import { SprintResultModal } from './sprint/SprintResultModal';
import { SprintMarkdownImporter } from './sprint/SprintMarkdownImporter';
import { SprintBattleItem } from './sprint/SprintBattleItem';

interface SprintPomodoroProps {
  onComplete: () => void;
  onNavigateToProjects?: () => void;
}

export const SprintPomodoro: React.FC<SprintPomodoroProps> = ({ onComplete, onNavigateToProjects }) => {
  const {
    state,
    timeLeft,
    startSprint,
    pauseSprint,
    resumeSprint,
    stopSprint,
    logResult,
    currentSprint,
    whiteNoiseEnabled,
    setWhiteNoiseEnabled,
    whiteNoiseVolume,
    setWhiteNoiseVolume
  } = useTimer();

  const [coreBattles, setCoreBattles] = useState<CoreBattle[]>([]);
  const [weeklyMissions, setWeeklyMissions] = useState<WeeklyMission[]>([]);
  const [result, setResult] = useState('');
  const [markAsCompleted, setMarkAsCompleted] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [busyEventId, setBusyEventId] = useState<string | null>(null);
  const [breakingDownId, setBreakingDownId] = useState<string | null>(null);
  const [subtasks, setSubtasks] = useState<Record<string, string[]>>({});

  const [selectedBattleIds, setSelectedBattleIds] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (state === 'logging') {
      setShowResultModal(true);
      if (busyEventId) {
        sync.deleteBusyEvent(busyEventId);
        setBusyEventId(null);
      }
    }
  }, [state, busyEventId]);

  const loadData = async () => {
    try {
      const [todayLog, missions] = await Promise.all([
        storage.getTodayLog(),
        storage.getWeeklyMissions()
      ]);
      setCoreBattles(todayLog.coreBattles);
      setWeeklyMissions(missions);
    } catch (error) {
      console.error('載入資料失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getMissionText = (missionId: string) => {
    const mission = weeklyMissions.find(m => m.id === missionId);
    return mission?.text || '未知任務';
  };

  const getMission = (missionId: string) => {
    return weeklyMissions.find(m => m.id === missionId);
  };

  const handleStartSprint = async (missionId: string, duration?: number) => {
    const missionText = getMissionText(missionId);
    try {
      const eventId = await sync.createBusyEvent(missionText, duration || 25);
      if (eventId) setBusyEventId(eventId);
    } catch (err) {
      console.warn('建立 Google Calendar 專注事件失敗 (不影響本地番茄鐘倒數):', err);
    }
    startSprint(missionId, duration);
  };

  const handleRemoveBattle = async (missionId: string) => {
    if (!window.confirm('確定要將此任務從今日規劃中移除嗎？')) return;
    try {
      const todayLog = await storage.getTodayLog();
      todayLog.coreBattles = todayLog.coreBattles.filter(b => b.missionId !== missionId);
      await storage.saveTodayLog(todayLog);
      setCoreBattles(todayLog.coreBattles);
    } catch (error) {
      console.error('移除今日戰役失敗:', error);
      alert('移除失敗，請重試');
    }
  };

  const handleResetToday = async () => {
    if (!window.confirm('確定要重新規劃今日戰役嗎？這將會清空今日已選定的任務規劃並返回簡報頁。')) return;
    try {
      const todayLog = await storage.getTodayLog();
      todayLog.coreBattles = [];
      await storage.saveTodayLog(todayLog);
      window.location.reload();
    } catch (error) {
      console.error('重設今日規劃失敗:', error);
      alert('重設失敗，請重試');
    }
  };

  const handleCompleteBattle = async (missionId: string) => {
    const notes = window.prompt('請輸入執行備註 (Execution Notes)，這將作為 AI 分析的語料：');
    if (notes === null) return;

    try {
      const success = await sync.completeTaskWithNotes(missionId, notes);
      if (success) {
        const updatedMissions = weeklyMissions.map(m =>
          m.id === missionId ? { ...m, isCompleted: true } : m
        );
        await storage.saveWeeklyMissions(updatedMissions);
        setWeeklyMissions(updatedMissions);
        alert('任務已標記為完成並同步成功！');
      } else {
        alert('標記完成同步失敗，請確認連線設定。');
      }
    } catch (err) {
      console.error('完成戰役同步失敗:', err);
      alert('同步發生錯誤');
    }
  };

  const handleStopSprint = () => {
    stopSprint();
    if (busyEventId) {
      sync.deleteBusyEvent(busyEventId);
      setBusyEventId(null);
    }
  };

  const handleSubmitResult = async () => {
    if (!result.trim()) {
      alert('請輸入本次衝刺的具體產出成果');
      return;
    }

    await logResult(result);

    if (markAsCompleted && currentSprint) {
      await sync.completeTaskWithNotes(currentSprint.missionId, result);
    }

    setResult('');
    setMarkAsCompleted(false);
    setShowResultModal(false);
    onComplete();
  };

  const handleBreakdown = async (missionId: string) => {
    setBreakingDownId(missionId);
    try {
      const breakdownResult = await sync.breakdownTask(missionId);
      if (breakdownResult && breakdownResult.length > 0) {
        setSubtasks(prev => ({ ...prev, [missionId]: breakdownResult }));
      } else {
        alert('AI 拆解失敗或無建議');
      }
    } catch (e) {
      console.error(e);
      alert('發生錯誤');
    } finally {
      setBreakingDownId(null);
    }
  };

  const handleSelectToggle = (missionId: string) => {
    setSelectedBattleIds(prev =>
      prev.includes(missionId) ? prev.filter(id => id !== missionId) : [...prev, missionId]
    );
  };

  const handleSelectAll = () => {
    if (selectedBattleIds.length === coreBattles.length) {
      setSelectedBattleIds([]);
    } else {
      setSelectedBattleIds(coreBattles.map(b => b.missionId));
    }
  };

  const handleCopyToMarkdown = () => {
    const today = new Date().toISOString().split('T')[0];
    let markdown = `### 今日核心戰役與進度 (${today})\n`;

    selectedBattleIds.forEach(missionId => {
      const mission = getMission(missionId);
      const battle = coreBattles.find(b => b.missionId === missionId);
      if (mission && battle) {
        const status = mission.isCompleted ? 'x' : ' ';
        markdown += `- [${status}] ${mission.text} (時間: ${battle.committedTime})\n`;
      }
    });

    navigator.clipboard.writeText(markdown)
      .then(() => alert('已複製 Markdown 格式任務到剪貼簿！'))
      .catch(err => {
        console.error('複製失敗:', err);
        alert('複製失敗，請手動複製。');
      });
  };

  const handleSaveText = async (missionId: string, text: string) => {
    if (!text.trim()) return;
    try {
      const updatedMissions = weeklyMissions.map(m =>
        m.id === missionId ? { ...m, text: text.trim() } : m
      );
      await storage.saveWeeklyMissions(updatedMissions);
      setWeeklyMissions(updatedMissions);
    } catch (error) {
      console.error('儲存修改失敗:', error);
      alert('儲存修改失敗');
    }
  };

  const handleSaveNotes = async (missionId: string, notes: string) => {
    try {
      const updatedMissions = weeklyMissions.map(m =>
        m.id === missionId ? { ...m, notes: notes.trim() } : m
      );
      await storage.saveWeeklyMissions(updatedMissions);
      setWeeklyMissions(updatedMissions);
    } catch (error) {
      console.error('儲存備註失敗:', error);
      alert('儲存備註失敗');
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const updated = [...coreBattles];
    const draggedItem = updated[draggedIndex];
    updated.splice(draggedIndex, 1);
    updated.splice(index, 0, draggedItem);

    setCoreBattles(updated);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    setDraggedIndex(null);
    try {
      const todayLog = await storage.getTodayLog();
      todayLog.coreBattles = coreBattles;
      await storage.saveTodayLog(todayLog);
    } catch (error) {
      console.error('儲存順序失敗:', error);
    }
  };

  const handleImportSuccess = async (newMissions: WeeklyMission[], newBattles: CoreBattle[]) => {
    const updatedWeekly = [...weeklyMissions, ...newMissions];
    await storage.saveWeeklyMissions(updatedWeekly);

    const todayLog = await storage.getTodayLog();
    todayLog.coreBattles = [...todayLog.coreBattles, ...newBattles];
    await storage.saveTodayLog(todayLog);

    setWeeklyMissions(updatedWeekly);
    setCoreBattles(todayLog.coreBattles);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-dark-primary mb-2">衝刺番茄鐘</h1>
        <p className="text-dark-secondary">專注執行你的核心戰役</p>
      </div>

      {/* 計時器顯示 */}
      {(state === 'running' || state === 'paused' || state === 'break') && (
        <div className="bg-dark-card border border-dark-border-subtle rounded-lg shadow-lg p-8 mb-6 text-center shadow-slate-950/40">
          <div className="text-6xl font-mono font-bold text-slate-50 mb-4 drop-shadow-[0_0_12px_rgba(96,165,250,0.4)]">
            {formatTime(timeLeft)}
          </div>
          <div className="text-lg text-dark-secondary mb-4">
            {state === 'running' && '衝刺中...'}
            {state === 'paused' && '已暫停'}
            {state === 'break' && '休息中...'}
          </div>
          <div className="flex space-x-4 justify-center">
            {state === 'running' && (
              <button
                onClick={pauseSprint}
                className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-500 font-semibold shadow-md shadow-yellow-950/30 transition-all"
              >
                暫停
              </button>
            )}
            {state === 'paused' && (
              <button
                onClick={resumeSprint}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 font-semibold shadow-md shadow-green-950/30 transition-all"
              >
                繼續
              </button>
            )}
            <button
              onClick={handleStopSprint}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 font-semibold shadow-md shadow-red-950/30 transition-all"
            >
              放棄衝刺
            </button>
          </div>

          {/* 專注白噪音控制列 */}
          {state === 'running' && (
            <div className="mt-6 pt-4 border-t border-dark-border-subtle flex items-center justify-center space-x-6">
              <label className="flex items-center space-x-2 text-sm text-dark-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={whiteNoiseEnabled}
                  onChange={(e) => setWhiteNoiseEnabled(e.target.checked)}
                  className="rounded text-blue-500 border-dark-border-default focus:ring-blue-500 bg-dark-card w-4 h-4 cursor-pointer"
                />
                <span className="font-medium">🎧 專注白噪音 (雨聲)</span>
              </label>
              {whiteNoiseEnabled && (
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-dark-muted">🔈</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={whiteNoiseVolume}
                    onChange={(e) => setWhiteNoiseVolume(parseFloat(e.target.value))}
                    className="w-24 h-1 bg-dark-surface rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <span className="text-xs text-dark-muted">🔊</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 專案池快速導航提示列：強化執行態邊界，指引使用者至規劃看板 */}
      {onNavigateToProjects && (
        <div className="mb-6 bg-gradient-to-r from-blue-950/40 via-purple-950/20 to-dark-surface/60 border border-blue-900/40 rounded-xl px-5 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2 text-sm text-dark-secondary">
            <span className="text-base">💡</span>
            <span>番茄鐘聚焦於<strong>當下衝刺與今日焦點</strong>。需整理任務池、拆解子任務或進行每週排程？</span>
          </div>
          <button
            onClick={onNavigateToProjects}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 hover:text-white rounded-lg text-xs font-semibold transition-all shadow-sm shrink-0 ml-4 cursor-pointer"
          >
            <span>📋 前往專案池挑選/規劃任務</span>
            <span className="text-xs">→</span>
          </button>
        </div>
      )}

      {/* 任務列表 */}
      <div className="bg-dark-card border border-dark-border-subtle rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4 border-b border-dark-border-subtle pb-2">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-semibold text-dark-primary">今日核心戰役</h2>
            <span className="text-xs text-dark-muted bg-dark-surface px-2.5 py-0.5 rounded-full border border-dark-border-subtle">
              {coreBattles.length} 個戰役
            </span>
          </div>
          <div className="flex space-x-2">
            {onNavigateToProjects && (
              <button
                onClick={onNavigateToProjects}
                className="px-3 py-1 bg-blue-950/30 hover:bg-blue-900/40 border border-blue-800/40 text-blue-400 rounded-lg text-xs transition-colors font-medium mr-1"
                title="切換至專案看板進行規劃與任務池管理"
              >
                📋 專案看板
              </button>
            )}
            {state === 'idle' && (
              <button
                onClick={handleResetToday}
                className="px-3 py-1 bg-red-950/30 hover:bg-red-900/40 border border-red-900/40 text-red-400 rounded-lg text-xs transition-colors font-medium mr-1"
              >
                ⬅️ 重新規劃今日
              </button>
            )}
            <button
              onClick={handleSelectAll}
              className="px-3 py-1 bg-dark-surface hover:bg-dark-hover border border-dark-border-default text-dark-secondary rounded-lg text-xs transition-colors"
            >
              {selectedBattleIds.length === coreBattles.length && coreBattles.length > 0 ? '取消全選' : '全選'}
            </button>
            <button
              onClick={handleCopyToMarkdown}
              disabled={selectedBattleIds.length === 0}
              className="px-3 py-1 bg-blue-950/40 hover:bg-blue-900/40 border border-blue-900/50 text-blue-400 rounded-lg text-xs disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              📋 複製所選任務 (Markdown)
            </button>
          </div>
        </div>

        {coreBattles.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-dark-border-subtle rounded-xl bg-dark-surface/20 my-2">
            <div className="text-3xl mb-2">🎯</div>
            <p className="text-dark-primary font-medium mb-1">今日尚未選定核心戰役</p>
            <p className="text-dark-secondary text-sm mb-4">建議保持 3~5 個焦點任務，進入高專注衝刺狀態！</p>
            {onNavigateToProjects && (
              <button
                onClick={onNavigateToProjects}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-all shadow-md shadow-blue-950/40 cursor-pointer"
              >
                📋 前往專案池挑選戰役
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {coreBattles.map((battle, index) => {
              const mission = getMission(battle.missionId);
              return (
                <SprintBattleItem
                  key={battle.missionId}
                  battle={battle}
                  mission={mission}
                  index={index}
                  state={state}
                  isSelected={selectedBattleIds.includes(battle.missionId)}
                  isDragged={draggedIndex === index}
                  isBreakingDown={breakingDownId === battle.missionId}
                  subtasks={subtasks[battle.missionId]}
                  onToggleSelect={() => handleSelectToggle(battle.missionId)}
                  onSaveText={handleSaveText}
                  onSaveNotes={handleSaveNotes}
                  onBreakdown={handleBreakdown}
                  onComplete={() => handleCompleteBattle(battle.missionId)}
                  onStartSprint={() => handleStartSprint(battle.missionId, mission?.suggestedDuration)}
                  onRemove={() => handleRemoveBattle(battle.missionId)}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                />
              );
            })}
          </div>
        )}

        {/* 匯入 Markdown 區塊 */}
        {state === 'idle' && (
          <SprintMarkdownImporter onImportSuccess={handleImportSuccess} />
        )}
      </div>

      {/* 成果記錄模態框 */}
      <SprintResultModal
        isOpen={showResultModal}
        result={result}
        setResult={setResult}
        markAsCompleted={markAsCompleted}
        setMarkAsCompleted={setMarkAsCompleted}
        onSubmit={handleSubmitResult}
        onCancel={() => {
          setShowResultModal(false);
          setResult('');
          stopSprint();
        }}
      />
    </div>
  );
};