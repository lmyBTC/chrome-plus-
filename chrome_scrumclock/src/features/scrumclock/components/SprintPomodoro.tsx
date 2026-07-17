import React, { useState, useEffect } from 'react';
import { useTimer } from '../contexts/TimerContext';
import { storage } from '../../../core/chrome/storage';
import { CoreBattle, WeeklyMission } from '../../../types';
import { sync } from '../../../core/api/sync';

interface SprintPomodoroProps {
  onComplete: () => void;
}

export const SprintPomodoro: React.FC<SprintPomodoroProps> = ({ onComplete }) => {
  const { state, timeLeft, startSprint, pauseSprint, resumeSprint, stopSprint, logResult, currentSprint, whiteNoiseEnabled, setWhiteNoiseEnabled, whiteNoiseVolume, setWhiteNoiseVolume } = useTimer();
  const [coreBattles, setCoreBattles] = useState<CoreBattle[]>([]);
  const [weeklyMissions, setWeeklyMissions] = useState<WeeklyMission[]>([]);
  const [result, setResult] = useState('');
  const [markAsCompleted, setMarkAsCompleted] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [busyEventId, setBusyEventId] = useState<string | null>(null);
  const [breakingDownId, setBreakingDownId] = useState<string | null>(null);
  const [subtasks, setSubtasks] = useState<Record<string, string[]>>({});
  
  // 新增的高效管理 States
  const [selectedBattleIds, setSelectedBattleIds] = useState<string[]>([]);
  const [editingMissionId, setEditingMissionId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  // Markdown 匯入專用 States
  const [importText, setImportText] = useState('');
  const [showImportArea, setShowImportArea] = useState(false);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [editingNotesText, setEditingNotesText] = useState('');

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

  // 從今日規劃中移除特定任務
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

  // 重新規劃今日戰役 (返回上一頁)
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

  // 面板手動標記完成並實時同步至 Notion/Google Tasks
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
      const result = await sync.breakdownTask(missionId);
      if (result && result.length > 0) {
        setSubtasks(prev => ({ ...prev, [missionId]: result }));
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

  // 處理任務多選
  const handleSelectToggle = (missionId: string) => {
    setSelectedBattleIds(prev => 
      prev.includes(missionId) ? prev.filter(id => id !== missionId) : [...prev, missionId]
    );
  };

  // 處理全選/取消全選
  const handleSelectAll = () => {
    if (selectedBattleIds.length === coreBattles.length) {
      setSelectedBattleIds([]);
    } else {
      setSelectedBattleIds(coreBattles.map(b => b.missionId));
    }
  };

  // 複製所選為 Markdown 格式
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

  // 儲存編輯的任務名稱
  const handleSaveText = async (missionId: string) => {
    if (!editingText.trim()) {
      setEditingMissionId(null);
      return;
    }
    try {
      const updatedMissions = weeklyMissions.map(m => 
        m.id === missionId ? { ...m, text: editingText.trim() } : m
      );
      await storage.saveWeeklyMissions(updatedMissions);
      setWeeklyMissions(updatedMissions);
    } catch (error) {
      console.error('儲存修改失敗:', error);
      alert('儲存修改失敗');
    } finally {
      setEditingMissionId(null);
    }
  };

  // 儲存任務備註
  const handleSaveNotes = async (missionId: string) => {
    try {
      const updatedMissions = weeklyMissions.map(m => 
        m.id === missionId ? { ...m, notes: editingNotesText.trim() } : m
      );
      await storage.saveWeeklyMissions(updatedMissions);
      setWeeklyMissions(updatedMissions);
    } catch (error) {
      console.error('儲存備註失敗:', error);
      alert('儲存備註失敗');
    } finally {
      setEditingNotesId(null);
    }
  };

  // 原生 Drag & Drop 排序事件
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

  // 處理批次匯入 Markdown 任務
  const handleImportMarkdown = async () => {
    if (!importText.trim()) {
      alert('請輸入 Markdown 格式任務');
      return;
    }

    const lines = importText.split('\n');
    const newMissions: WeeklyMission[] = [];
    const newBattles: CoreBattle[] = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      let isCompleted = false;
      let text = trimmed;

      // 1. 匹配有 checkbox 的清單，例如: - [ ] 任務名稱 或 - [x] 任務名稱
      const checkboxMatch = trimmed.match(/^\s*[-*+]\s*\[([ xX/])\]\s*(.*)$/);
      // 2. 匹配普通無序列表清單，例如: - 任務名稱 或 * 任務名稱
      const bulletMatch = trimmed.match(/^\s*[-*+]\s+(.*)$/);

      if (checkboxMatch) {
        isCompleted = checkboxMatch[1].toLowerCase() === 'x';
        text = checkboxMatch[2];
      } else if (bulletMatch) {
        text = bulletMatch[1];
      }

      // 3. 解析時間區間，例如: (時間: 10:00-11:00) 或 (10:00-11:00)
      let committedTime = '09:00-10:00';
      const timeMatch = text.match(/(?:\(|（|\[|時間:\s*|Time:\s*)([0-2]\d:[0-5]\d\s*-\s*[0-2]\d:[0-5]\d)(?:\)|）|\])/i);
      
      if (timeMatch) {
        committedTime = timeMatch[1];
        text = text.replace(timeMatch[0], '').trim();
      }

      // 建立任務識別 ID
      const missionId = `import-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`;
      newMissions.push({
        id: missionId,
        text: text,
        isCompleted: isCompleted
      });

      newBattles.push({
        missionId: missionId,
        committedTime: committedTime
      });
    });

    if (newMissions.length === 0) {
      alert('未辨識出有效的條列任務');
      return;
    }

    try {
      // 儲存至 weeklyMissions
      const updatedWeekly = [...weeklyMissions, ...newMissions];
      await storage.saveWeeklyMissions(updatedWeekly);

      // 儲存至今日日誌的 coreBattles
      const todayLog = await storage.getTodayLog();
      todayLog.coreBattles = [...todayLog.coreBattles, ...newBattles];
      await storage.saveTodayLog(todayLog);

      // 同步更新前端狀態
      setWeeklyMissions(updatedWeekly);
      setCoreBattles(todayLog.coreBattles);
      setImportText('');
      setShowImportArea(false);
      alert(`成功匯入 ${newMissions.length} 個任務！`);
    } catch (error) {
      console.error('匯入任務失敗:', error);
      alert('匯入任務失敗，請重試');
    }
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
        <h1 className="text-3xl font-bold text-dark-primary mb-2">
          衝刺番茄鐘
        </h1>
        <p className="text-dark-secondary">
          專注執行你的核心戰役
        </p>
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

      {/* 任務列表 */}
      <div className="bg-dark-card border border-dark-border-subtle rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4 border-b border-dark-border-subtle pb-2">
          <h2 className="text-xl font-semibold text-dark-primary">今日核心戰役</h2>
          <div className="flex space-x-2">
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
        <div className="space-y-4">
          {coreBattles.map((battle, index) => {
            const mission = getMission(battle.missionId);
            return (
            <div 
              key={battle.missionId} 
              draggable={state === 'idle'}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`flex flex-col p-4 border rounded-lg transition-all ${
                draggedIndex === index 
                  ? 'opacity-50 border-blue-500 bg-blue-950/30' 
                  : 'bg-dark-surface/40 hover:bg-dark-surface/80 border-dark-border-subtle hover:border-dark-border-default'
              } ${state === 'idle' ? 'cursor-grab' : ''}`}
            >
              {mission?.aiTip && (
                <div className="mb-3 text-sm text-yellow-400 bg-yellow-950/20 p-3 rounded-lg border border-yellow-900/50">
                  ✨ <strong>AI 歷史教訓提醒：</strong> {mission.aiTip}
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center flex-1 mr-4">
                  {/* 拖曳手把 */}
                  {state === 'idle' && (
                    <div className="text-dark-muted mr-2 select-none cursor-grab active:cursor-grabbing text-lg" title="拖曳排序">
                      ☰
                    </div>
                  )}
                  {/* 多選 Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedBattleIds.includes(battle.missionId)}
                    onChange={() => handleSelectToggle(battle.missionId)}
                    className="w-4 h-4 text-blue-500 border-dark-border-default rounded focus:ring-blue-500 mr-3 cursor-pointer bg-dark-card"
                  />
                  <div className="flex-1">
                    {editingMissionId === battle.missionId ? (
                      <input
                        type="text"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveText(battle.missionId);
                          if (e.key === 'Escape') setEditingMissionId(null);
                        }}
                        onBlur={() => handleSaveText(battle.missionId)}
                        className="w-full px-2 py-1 bg-dark-card border border-dark-border-default text-dark-primary rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                        autoFocus
                      />
                    ) : (
                      <div className="flex items-center space-x-2">
                        <h3 
                          onDoubleClick={() => {
                            if (state === 'idle') {
                              setEditingMissionId(battle.missionId);
                              setEditingText(getMissionText(battle.missionId));
                            }
                          }}
                          className={`font-medium text-dark-primary cursor-pointer hover:text-blue-400 transition-colors select-none ${mission?.isCompleted ? 'line-through text-slate-500' : ''}`}
                          title="雙擊編輯任務名稱"
                        >
                          {getMissionText(battle.missionId)}
                        </h3>
                        {state === 'idle' && (
                          <button
                            onClick={() => {
                              setEditingMissionId(battle.missionId);
                              setEditingText(getMissionText(battle.missionId));
                            }}
                            className="px-2 py-0.5 bg-dark-card hover:bg-dark-hover border border-dark-border-default text-dark-secondary rounded text-xs transition-colors ml-1 font-semibold"
                            title="編輯任務名稱"
                          >
                            ✏️ 編輯
                          </button>
                        )}
                      </div>
                    )}
                    <p className="text-sm text-dark-muted mt-1">
                      承諾時間: {battle.committedTime} {mission?.suggestedDuration ? `| AI建議: ${mission.suggestedDuration}分鐘` : ''}
                    </p>
                    
                    {/* 備註顯示與編輯區塊 */}
                    <div className="mt-2 text-sm">
                      {editingNotesId === battle.missionId ? (
                        <div className="flex flex-col gap-2 mt-1">
                          <textarea
                            value={editingNotesText}
                            onChange={(e) => setEditingNotesText(e.target.value)}
                            placeholder="記錄遇到的問題、備忘或執行備註..."
                            className="w-full p-2 bg-dark-card border border-dark-border-default text-dark-primary rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-mono"
                            rows={2}
                            autoFocus
                          />
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => setEditingNotesId(null)}
                              className="px-2 py-1 bg-dark-hover border border-dark-border-default text-dark-secondary rounded text-xs transition-colors"
                            >
                              取消
                            </button>
                            <button
                              onClick={() => handleSaveNotes(battle.missionId)}
                              className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold transition-colors"
                            >
                              儲存備註
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          onClick={() => {
                            setEditingNotesId(battle.missionId);
                            setEditingNotesText(mission?.notes || '');
                          }}
                          className="group/notes flex items-center space-x-1 cursor-pointer bg-dark-card/30 hover:bg-dark-card/80 border border-transparent hover:border-dark-border-default rounded p-1.5 transition-all"
                          title="點擊編輯任務備註"
                        >
                          <span className="text-dark-muted text-xs">📝 備註:</span>
                          <span className="text-xs text-dark-secondary flex-1 break-all truncate italic">
                            {mission?.notes || '點擊新增備註，紀錄遇到的問題...'}
                          </span>
                          {mission?.notes && (
                            <span className="opacity-0 group-hover/notes:opacity-100 text-xs text-blue-400 ml-1 transition-opacity">✏️</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {state === 'idle' && (
                  <div className="flex space-x-2 items-center">
                    <button
                      onClick={() => handleBreakdown(battle.missionId)}
                      disabled={breakingDownId === battle.missionId}
                      className="px-3 py-1.5 bg-purple-950/40 border border-purple-900/50 text-purple-400 rounded-lg hover:bg-purple-900/40 text-sm disabled:opacity-50"
                    >
                      {breakingDownId === battle.missionId ? '拆解中...' : '✨ AI 幫我拆'}
                    </button>
                    {!mission?.isCompleted && (
                      <button
                        onClick={() => handleCompleteBattle(battle.missionId)}
                        className="px-3 py-1.5 bg-green-950/40 border border-green-900/50 text-green-400 rounded-lg hover:bg-green-900/40 text-sm font-semibold whitespace-nowrap"
                        title="將此任務標記完成並實時同步"
                      >
                        ✓ 完成
                      </button>
                    )}
                    <button
                      onClick={() => handleStartSprint(battle.missionId, mission?.suggestedDuration)}
                      className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-sm font-semibold shadow-md shadow-blue-950/40"
                    >
                      開始衝刺
                    </button>
                    <button
                      onClick={() => handleRemoveBattle(battle.missionId)}
                      className="px-3 py-1.5 bg-red-950/30 border border-red-900/40 text-red-400 rounded-lg hover:bg-red-900/40 text-sm transition-colors"
                      title="從今日規劃中移除"
                    >
                      ❌ 移除
                    </button>
                  </div>
                )}
              </div>
              {/* 顯示子任務 */}
              {subtasks[battle.missionId] && subtasks[battle.missionId].length > 0 && (
                <div className="mt-3 pl-4 border-l-2 border-purple-900/60">
                  <p className="text-xs font-semibold text-purple-400 mb-1">AI 建議的拆解步驟：</p>
                  <ul className="list-disc list-inside text-sm text-dark-secondary space-y-1">
                    {subtasks[battle.missionId].map((subtask, idx) => (
                      <li key={idx}>{subtask}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            );
          })}
        </div>

        {/* 匯入 Markdown 區塊 */}
        {state === 'idle' && (
          <div className="mt-6 border-t border-dark-border-subtle pt-4">
            {!showImportArea ? (
              <button
                onClick={() => setShowImportArea(true)}
                className="w-full py-2 bg-dark-surface hover:bg-dark-hover border border-dashed border-dark-border-default rounded-lg text-sm text-dark-secondary transition-colors flex items-center justify-center space-x-1"
              >
                <span>📥 批次匯入 Markdown 任務</span>
              </button>
            ) : (
              <div className="bg-dark-surface rounded-lg p-4 border border-dark-border-default">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-semibold text-dark-primary">📥 貼上 Markdown 任務列表</h3>
                  <button
                    onClick={() => setShowImportArea(false)}
                    className="text-xs text-dark-muted hover:text-dark-primary"
                  >
                    收合
                  </button>
                </div>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={`請貼入 Markdown 格式條列任務，例如：\n- [ ] 任務名稱 A (10:00-11:00)\n- [x] 已完成任務 B (13:00-14:00)\n- 普通任務 C`}
                  className="w-full p-3 bg-dark-card border border-dark-border-default text-dark-primary rounded-lg text-sm font-mono mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={5}
                />
                <div className="flex space-x-2 justify-end">
                  <button
                    onClick={() => setShowImportArea(false)}
                    className="px-3 py-1.5 bg-dark-hover hover:bg-dark-card border border-dark-border-default text-dark-secondary rounded-lg text-xs transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleImportMarkdown}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-md shadow-blue-950/40"
                  >
                    確認匯入
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 成果記錄模態框 */}
      {showResultModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-dark-card border border-dark-border-subtle rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl shadow-slate-950/80 animate-fade-in">
            <h3 className="text-lg font-semibold mb-4 text-dark-primary">記錄本次衝刺成果</h3>
            <p className="text-sm text-dark-secondary mb-4">
              請用一句話簡潔地記錄本次衝刺的具體產出成果
            </p>
            <textarea
              value={result}
              onChange={(e) => setResult(e.target.value)}
              placeholder="例如：完成了 SPEC 文件的使用者故事草稿"
              className="w-full p-3 bg-dark-surface border border-dark-border-default text-dark-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              rows={3}
            />
            <label className="flex items-center space-x-2 mt-3 text-sm text-dark-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={markAsCompleted}
                onChange={(e) => setMarkAsCompleted(e.target.checked)}
                className="rounded text-blue-500 border-dark-border-default focus:ring-blue-500 bg-dark-card w-4 h-4 cursor-pointer"
              />
              <span>同時標記此任務為「已完成」並同步至 Sheet</span>
            </label>
            <div className="flex space-x-3 mt-4">
              <button
                onClick={handleSubmitResult}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors shadow-md shadow-blue-950/40 font-semibold"
              >
                提交
              </button>
              <button
                onClick={() => {
                  setShowResultModal(false);
                  setResult('');
                  stopSprint();
                }}
                className="flex-1 px-4 py-2 bg-dark-hover hover:bg-dark-card border border-dark-border-default text-dark-secondary rounded-lg transition-colors font-semibold"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 