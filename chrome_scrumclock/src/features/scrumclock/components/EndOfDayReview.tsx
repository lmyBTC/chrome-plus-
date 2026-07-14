import React, { useState, useEffect } from 'react';
import { storage } from '../../../core/chrome/storage';
import { sync } from '../../../core/api/sync';
import { DailyLog, SprintLog, CoreBattle, WeeklyMission, DailyReview } from '../../../types';

interface EndOfDayReviewProps {
  onComplete: () => void;
}

export const EndOfDayReview: React.FC<EndOfDayReviewProps> = ({ onComplete }) => {
  const [todayLog, setTodayLog] = useState<DailyLog | null>(null);
  const [weeklyMissions, setWeeklyMissions] = useState<WeeklyMission[]>([]);
  const [review, setReview] = useState<DailyReview>({
    highlight: '',
    lesson: '',
    nextAction: ''
  });
  const [completedMissionIds, setCompletedMissionIds] = useState<string[]>([]);
  const [tomorrowBattles, setTomorrowBattles] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [log, missions, savedTomorrow] = await Promise.all([
        storage.getTodayLog(),
        storage.getWeeklyMissions(),
        storage.getTomorrowBattles()
      ]);
      setTodayLog(log);
      setWeeklyMissions(missions);
      setTomorrowBattles(savedTomorrow);
    } catch (error) {
      console.error('載入資料失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getMissionText = (missionId: string) => {
    const mission = weeklyMissions.find(m => m.id === missionId);
    return mission?.text || '未知任務';
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUncompletedBattles = () => {
    if (!todayLog) return [];
    
    const completedMissionIds = todayLog.sprintLogs.map(sprint => sprint.missionId);
    return todayLog.coreBattles.filter(battle => 
      !completedMissionIds.includes(battle.missionId)
    );
  };

  const handleMissionToggle = (missionId: string) => {
    setCompletedMissionIds(prev => {
      if (prev.includes(missionId)) {
        return prev.filter(id => id !== missionId);
      } else {
        return [...prev, missionId];
      }
    });
  };

  const handleSubmit = async () => {
    if (!review.highlight.trim() || !review.lesson.trim() || !review.nextAction.trim()) {
      alert('請填寫所有回顧問題');
      return;
    }

    setIsSubmitting(true);
    try {
      // 處理完成的任務
      if (completedMissionIds.length > 0) {
        const updatedMissions = [...weeklyMissions];
        for (const missionId of completedMissionIds) {
          const mIndex = updatedMissions.findIndex(m => m.id === missionId);
          if (mIndex !== -1) {
            updatedMissions[mIndex].isCompleted = true;
          }
          // 同步完成 Google Task
          if (missionId.startsWith('gtask-')) {
            await sync.completeTaskWithNotes(missionId, '');
          }
        }
        await storage.saveWeeklyMissions(updatedMissions);
      }

      if (todayLog) {
        todayLog.review = review;
        await storage.saveTodayLog(todayLog);
        
        // 背景同步至 Google Sheets
        sync.pushReviewLog(review).catch(err => console.error(err));
      }
      
      await storage.saveTomorrowBattles(tomorrowBattles);
      
      onComplete();
    } catch (error) {
      console.error('儲存回顧失敗:', error);
      alert('儲存失敗，請重試');
    } finally {
      setIsSubmitting(false);
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
          日終回顧
        </h1>
        <p className="text-dark-secondary">
          回顧今日的衝刺成果，提煉洞見
        </p>
      </div>

      {/* 衝刺成果時間線 */}
      {todayLog && todayLog.sprintLogs.length > 0 && (
        <div className="bg-dark-card border border-dark-border-subtle rounded-lg shadow-lg p-6 mb-6 shadow-slate-950/40">
          <h2 className="text-xl font-semibold mb-4 text-dark-primary">今日衝刺成果</h2>
          <div className="space-y-4">
            {todayLog.sprintLogs.map((sprint, index) => (
              <div key={sprint.sprintId} className="flex items-start space-x-4 p-4 border border-dark-border-subtle bg-dark-surface/40 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-dark-primary">
                    {getMissionText(sprint.missionId)}
                  </h3>
                  <p className="text-sm text-dark-muted mt-1">
                    {formatTime(sprint.startTime)} - {formatTime(sprint.endTime)}
                  </p>
                  <p className="text-dark-secondary mt-2">
                    {sprint.result}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 未完成的戰役 */}
      {getUncompletedBattles().length > 0 && (
        <div className="bg-yellow-950/20 border border-yellow-900/40 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-yellow-400">未啟動的戰役</h2>
          <div className="space-y-2">
            {getUncompletedBattles().map(battle => (
              <div key={battle.missionId} className="text-yellow-300">
                • {getMissionText(battle.missionId)} (承諾時間: {battle.committedTime})
              </div>
            ))}
          </div>
          <p className="text-sm text-yellow-400/80 mt-3">
            思考：為什麼 these 戰役沒有啟動？如何改進明天的規劃？
          </p>
        </div>
      )}

      {/* 任務完成確認 */}
      {todayLog && todayLog.coreBattles.length > 0 && (
        <div className="bg-dark-card border border-dark-border-subtle rounded-lg shadow-lg p-6 mb-6 shadow-slate-950/40">
          <h2 className="text-xl font-semibold mb-4 text-green-400">✅ 戰役結算</h2>
          <p className="text-sm text-dark-muted mb-4">請勾選今天確實已經 100% 完成的戰役（將會同步標記 Google Tasks 為完成）：</p>
          <div className="space-y-3">
            {todayLog.coreBattles.map(battle => {
              const mission = weeklyMissions.find(m => m.id === battle.missionId);
              if (!mission) return null;
              
              return (
                <div key={battle.missionId} className="flex items-center space-x-3 p-3 border border-dark-border-subtle bg-dark-surface/40 hover:bg-dark-surface/70 rounded-lg transition-all">
                  <input
                    type="checkbox"
                    id={`complete-${battle.missionId}`}
                    checked={completedMissionIds.includes(battle.missionId) || mission.isCompleted}
                    disabled={mission.isCompleted}
                    onChange={() => handleMissionToggle(battle.missionId)}
                    className="w-5 h-5 text-green-500 border-dark-border-default rounded focus:ring-green-500 bg-dark-card cursor-pointer"
                  />
                  <label htmlFor={`complete-${battle.missionId}`} className={`flex-1 cursor-pointer ${mission.isCompleted || completedMissionIds.includes(battle.missionId) ? 'line-through text-slate-500' : 'text-dark-secondary'}`}>
                    {mission.text}
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 回顧問題 */}
      <div className="bg-dark-card border border-dark-border-subtle rounded-lg shadow-lg p-6 mb-6 shadow-slate-950/40">
        <h2 className="text-xl font-semibold mb-4 text-dark-primary">提煉洞見</h2>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-dark-secondary mb-2">
              今日高光時刻
            </label>
            <textarea
              value={review.highlight}
              onChange={(e) => setReview(prev => ({ ...prev, highlight: e.target.value }))}
              placeholder="今天哪個衝刺讓你最有成就感？"
              className="w-full p-3 bg-dark-surface border border-dark-border-default text-dark-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              rows={3}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-dark-secondary mb-2">
              最大教訓
            </label>
            <textarea
              value={review.lesson}
              onChange={(e) => setReview(prev => ({ ...prev, lesson: e.target.value }))}
              placeholder="如果能讓今天重來一次，你會如何調整你的衝刺計畫？"
              className="w-full p-3 bg-dark-surface border border-dark-border-default text-dark-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              rows={3}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-dark-secondary mb-2">
              明日關鍵行動
            </label>
            <textarea
              value={review.nextAction}
              onChange={(e) => setReview(prev => ({ ...prev, nextAction: e.target.value }))}
              placeholder="基於今天的回顧，你承諾在明天做出唯一一個最重要的微小改進是什麼？"
              className="w-full p-3 bg-dark-surface border border-dark-border-default text-dark-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* 明日預排 */}
      <div className="bg-dark-card rounded-lg shadow-lg p-6 mb-6 border border-indigo-900/50 shadow-slate-950/40">
        <h2 className="text-xl font-semibold mb-4 text-indigo-400 font-semibold">🌙 明日預排 (Next-Day Prep)</h2>
        <p className="text-sm text-dark-muted mb-4">挑選 1-3 個明天最重要的戰役，為明天早晨省下意志力：</p>
        <div className="space-y-3">
          {weeklyMissions.filter(m => !m.isCompleted).map(mission => (
            <div key={mission.id} className="flex items-center space-x-3 p-3 border border-dark-border-subtle bg-dark-surface/40 hover:bg-indigo-950/30 rounded-lg transition-all">
              <input
                type="checkbox"
                id={`tomorrow-${mission.id}`}
                checked={tomorrowBattles.includes(mission.id)}
                onChange={() => {
                  setTomorrowBattles(prev => 
                    prev.includes(mission.id) ? prev.filter(id => id !== mission.id) : [...prev, mission.id]
                  );
                }}
                className="w-5 h-5 text-indigo-500 border-dark-border-default rounded focus:ring-indigo-500 bg-dark-card cursor-pointer"
              />
              <label htmlFor={`tomorrow-${mission.id}`} className="flex-1 text-dark-secondary cursor-pointer">
                {mission.text}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-500 disabled:opacity-50 transition-colors shadow-lg shadow-blue-500/20"
        >
          {isSubmitting ? '儲存中...' : '完成回顧'}
        </button>
      </div>
    </div>
  );
}; 