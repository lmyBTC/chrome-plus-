import React, { useState, useEffect } from 'react';
import { storage } from '../../../core/chrome/storage';
import { sync } from '../../../core/api/sync';
import { DailyLog, SprintLog, CoreBattle, WeeklyMission, DailyReview } from '../../../types';
import { TaskAIEngine } from '../../project-management/services/taskAIEngine';

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
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

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

  const handleGenerateAISummary = async () => {
    setIsGeneratingAI(true);
    try {
      const aiEngine = TaskAIEngine.getInstance();
      // 收集今日完成或參與衝刺的任務
      const completedTasks = weeklyMissions.filter(
        m => completedMissionIds.includes(m.id) || m.isCompleted
      );
      const targetTasks = completedTasks.length > 0
        ? completedTasks
        : (todayLog?.sprintLogs?.map(s => {
            const m = weeklyMissions.find(w => w.id === s.missionId);
            return m || {
              id: s.missionId,
              text: getMissionText(s.missionId),
              isCompleted: false,
              spentPomodoros: 1
            } as WeeklyMission;
          }) || []);

      const spentPomodoros = todayLog?.sprintLogs?.length || 1;
      const summary = await aiEngine.generateDailyReviewSummary(targetTasks, spentPomodoros);
      setAiSummary(summary);
    } catch (error) {
      console.error('生成日終戰報失敗:', error);
      alert('AI 戰報生成失敗，請確認已啟用 Web AI API');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleApplyAISummaryToFields = () => {
    if (!aiSummary) return;
    setReview(prev => ({
      highlight: prev.highlight || `今日核心衝刺成效：\n${aiSummary.slice(0, 150)}...`,
      lesson: prev.lesson || '專注於高槓桿目標，減少非預期中斷與切換損耗。',
      nextAction: prev.nextAction || '早晨第一時間直接啟動明日第一優先之預排戰役。'
    }));
  };

  const generateMarkdownContent = (): string => {
    const dateStr = new Date().toISOString().split('T')[0];
    const spentPomodoros = todayLog?.sprintLogs?.length || 0;
    const completedCount = completedMissionIds.length;
    const tomorrowList = tomorrowBattles
      .map(id => getMissionText(id))
      .filter(Boolean);

    return `---
title: "日終回顧 - ${dateStr}"
date: ${dateStr}
type: daily-review
pomodoros: ${spentPomodoros}
completed_tasks: ${completedCount}
tags: [daily-review, scrumclock, productivity]
---

# 🎯 今日日終戰報與反思 (${dateStr})

## 📊 數據統計
- **總投入番茄鐘**：${spentPomodoros} 🍅
- **完成任務數**：${completedCount} 項

## 🏆 今日高光時刻
${review.highlight.trim() || '（無）'}

## 💡 最大教訓與洞見
${review.lesson.trim() || '（無）'}

## 🚀 明日關鍵行動
${review.nextAction.trim() || '（無）'}

## 🌙 明日預排戰役
${tomorrowList.length > 0 ? tomorrowList.map(t => `- ${t}`).join('\n') : '- （無預排戰役）'}

${aiSummary ? `## 🤖 Gemini Nano 智慧戰報\n${aiSummary}\n` : ''}
`;
  };

  const handleExportMarkdown = () => {
    const content = generateMarkdownContent();
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-review-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyMarkdown = async () => {
    const content = generateMarkdownContent();
    try {
      await navigator.clipboard.writeText(content);
      setCopyFeedback('已複製 Markdown 筆記（含 YAML Frontmatter）至剪貼簿！');
      setTimeout(() => setCopyFeedback(null), 3000);
    } catch (err) {
      console.error('複製失敗:', err);
    }
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

      {/* ✨ Gemini Nano 智慧日終戰報 */}
      <div className="bg-gradient-to-r from-purple-950/30 to-indigo-950/30 border border-purple-800/40 rounded-xl p-6 mb-6 shadow-lg shadow-purple-950/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-purple-300 flex items-center gap-2">
              <span>🤖</span> Gemini Nano 今日智慧戰報
            </h2>
            <p className="text-xs text-purple-400/80 mt-1">
              調用本機邊緣 Nano 模型（ai.summarizer），自動萃取今日戰功、潛在延宕與明日洞見
            </p>
          </div>
          <button
            onClick={handleGenerateAISummary}
            disabled={isGeneratingAI}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 border shadow-md ${
              isGeneratingAI
                ? 'bg-purple-950/60 border-purple-800 text-purple-400 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-500 text-white border-purple-500 hover:shadow-purple-500/25'
            }`}
          >
            {isGeneratingAI ? (
              <>
                <span className="animate-spin inline-block h-4 w-4 border-2 border-purple-200 border-t-transparent rounded-full"></span>
                <span>Nano 邊緣提煉中...</span>
              </>
            ) : (
              <>
                <span>✨ 一鍵產生今日戰報</span>
              </>
            )}
          </button>
        </div>

        {aiSummary && (
          <div className="mt-4 p-4 rounded-lg bg-dark-card/80 border border-purple-900/50 space-y-3">
            <div className="text-sm text-dark-primary whitespace-pre-wrap leading-relaxed font-sans">
              {aiSummary}
            </div>
            <div className="flex justify-end pt-2 border-t border-purple-900/30">
              <button
                onClick={handleApplyAISummaryToFields}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-purple-950/80 hover:bg-purple-900 border border-purple-700/50 text-purple-200 hover:text-white transition-all flex items-center gap-1.5"
              >
                <span>🪄</span>
                <span>帶入下方提煉洞見欄位</span>
              </button>
            </div>
          </div>
        )}
      </div>

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

      {copyFeedback && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold border backdrop-blur-md bg-emerald-900/90 border-emerald-600/50 text-emerald-200">
          {copyFeedback}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <button
          type="button"
          onClick={handleExportMarkdown}
          className="w-full sm:w-auto px-5 py-3 bg-dark-card border border-dark-border-subtle hover:border-dark-border-default text-dark-secondary hover:text-dark-primary rounded-lg font-medium transition-colors text-sm flex items-center justify-center gap-2 shadow-sm"
          title="匯出包含 YAML Frontmatter 的 Markdown 格式筆記"
        >
          <span>📥</span> 匯出 Markdown 筆記
        </button>

        <button
          type="button"
          onClick={handleCopyMarkdown}
          className="w-full sm:w-auto px-5 py-3 bg-dark-card border border-dark-border-subtle hover:border-dark-border-default text-dark-secondary hover:text-dark-primary rounded-lg font-medium transition-colors text-sm flex items-center justify-center gap-2 shadow-sm"
          title="複製 Markdown 格式筆記至剪貼簿"
        >
          <span>📋</span> 複製筆記至剪貼簿
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full sm:w-auto px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-500 disabled:opacity-50 transition-colors shadow-lg shadow-blue-500/20"
        >
          {isSubmitting ? '儲存中...' : '完成回顧'}
        </button>
      </div>
    </div>
  );
}; 