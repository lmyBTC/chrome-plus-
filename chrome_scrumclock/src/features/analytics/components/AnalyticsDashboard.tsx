import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { storage } from '../../../core/chrome/storage';
import { DailyLog, WeeklyMission } from '../../../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export const AnalyticsDashboard: React.FC = () => {
  const [logs, setLogs] = useState<Record<string, DailyLog>>({});
  const [isLoading, setIsLoading] = useState(true);
  
  // 新增已完成任務報告 States
  const [completedReport, setCompletedReport] = useState<{
    today: { id: string; text: string; pomodoros: number }[];
    weekly: { id: string; text: string; pomodoros: number }[];
  }>({ today: [], weekly: [] });

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const [recentLogs, missions] = await Promise.all([
        storage.getLast7DaysLogs(),
        storage.getWeeklyMissions()
      ]);
      setLogs(recentLogs);

      const todayStr = new Date().toISOString().split('T')[0];

      // 1. 統計今日各任務番茄鐘個數
      const todayPomoMap: Record<string, number> = {};
      const todayLog = recentLogs[todayStr];
      if (todayLog) {
        todayLog.sprintLogs.forEach(sprint => {
          todayPomoMap[sprint.missionId] = (todayPomoMap[sprint.missionId] || 0) + 1;
        });
      }

      // 2. 統計本週各任務番茄鐘個數
      const weeklyPomoMap: Record<string, number> = {};
      Object.values(recentLogs).forEach(dayLog => {
        dayLog.sprintLogs.forEach(sprint => {
          weeklyPomoMap[sprint.missionId] = (weeklyPomoMap[sprint.missionId] || 0) + 1;
        });
      });

      // 3. 過濾出已完成的週任務，並計算累積的番茄
      const completedToday: any[] = [];
      const completedWeekly: any[] = [];

      missions.forEach(mission => {
        if (mission.isCompleted) {
          const todayPomos = todayPomoMap[mission.id] || 0;
          const weeklyPomos = weeklyPomoMap[mission.id] || 0;

          if (todayPomos > 0) {
            completedToday.push({
              id: mission.id,
              text: mission.text,
              pomodoros: todayPomos
            });
          }

          if (weeklyPomos > 0) {
            completedWeekly.push({
              id: mission.id,
              text: mission.text,
              pomodoros: weeklyPomos
            });
          }
        }
      });

      setCompletedReport({
        today: completedToday,
        weekly: completedWeekly
      });

    } catch (error) {
      console.error('Failed to load analytics', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 渲染番茄鐘圖示
  const renderTomatoIcons = (count: number) => {
    return (
      <div className="flex items-center space-x-1">
        <span className="text-red-500 font-mono tracking-tighter" title={`${count} 個番茄鐘`}>
          {"🍅".repeat(Math.min(count, 5))}
          {count > 5 && `+${count - 5}`}
        </span>
        <span className="text-dark-muted text-xs ml-1 font-medium">({count})</span>
      </div>
    );
  };

  const handleExportReportToMarkdown = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    let markdown = `## 📊 Scrumclock 工作報告 (${todayStr})\n\n`;
    
    markdown += `### 🏆 今日已完成核心戰役\n`;
    if (completedReport.today.length === 0) {
      markdown += `* 今天尚未有完成核心戰役的紀錄。\n`;
    } else {
      completedReport.today.forEach(item => {
        markdown += `- [x] ${item.text} (${item.pomodoros} 🍅)\n`;
      });
    }
    
    markdown += `\n### 🔥 本週已完成任務（累積番茄數）\n`;
    if (completedReport.weekly.length === 0) {
      markdown += `* 本週尚未有完成的任務進度。\n`;
    } else {
      completedReport.weekly.forEach(item => {
        markdown += `- [x] ${item.text} (累計已推進 ${item.pomodoros} 🍅)\n`;
      });
    }
    
    navigator.clipboard.writeText(markdown)
      .then(() => alert('工作報告（Markdown 格式）已成功複製到您的剪貼簿！'))
      .catch(err => {
        console.error('導出報告失敗:', err);
        alert('複製失敗，請檢查權限。');
      });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // 準備圖表資料 (最近 7 天)
  const labels: string[] = [];
  const focusTimeData: number[] = [];
  const tasksCompletedData: number[] = [];
  const sprintCountData: number[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const displayDate = `${d.getMonth() + 1}/${d.getDate()}`;
    labels.push(displayDate);

    const dayLog = logs[dateStr];
    if (dayLog) {
      // 計算總專注時間 (分鐘)
      const totalMinutes = dayLog.sprintLogs.reduce((acc, sprint) => {
        return acc + (sprint.endTime - sprint.startTime) / 60000;
      }, 0);
      focusTimeData.push(Math.round(totalMinutes));

      // 計算完成的核心戰役數 (從 review 推測或至少看 sprintLog 有沒有該 mission)
      const completedIds = new Set(dayLog.sprintLogs.map(s => s.missionId));
      tasksCompletedData.push(completedIds.size);
      
      // 計算番茄鐘數量
      sprintCountData.push(dayLog.sprintLogs.length);
    } else {
      focusTimeData.push(0);
      tasksCompletedData.push(0);
      sprintCountData.push(0);
    }
  }

  const chartData = {
    labels,
    datasets: [
      {
        label: '專注時數 (分鐘)',
        data: focusTimeData,
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
        borderRadius: 4
      },
      {
        label: '推進戰役數',
        data: tasksCompletedData,
        backgroundColor: 'rgba(16, 185, 129, 0.7)',
        borderRadius: 4
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: '過去 7 天專注趨勢',
        font: { size: 16 }
      },
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  const totalWeeklyFocus = focusTimeData.reduce((a, b) => a + b, 0);
  const totalWeeklyTasks = tasksCompletedData.reduce((a, b) => a + b, 0);
  
  // 熱力圖相關
  const maxSprints = Math.max(...sprintCountData, 1);
  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-dark-surface border border-dark-border-default';
    const ratio = count / maxSprints;
    if (ratio <= 0.25) return 'bg-green-950/60 text-green-400 border border-green-900/40';
    if (ratio <= 0.5) return 'bg-green-900/60 text-green-300 border border-green-800/40';
    if (ratio <= 0.75) return 'bg-green-700/80 text-green-100 border border-green-600/40';
    return 'bg-green-600 text-white';
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-dark-primary mb-2">
          📊 數據統計
        </h1>
        <p className="text-dark-secondary">
          回顧你的深度工作軌跡
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-dark-card border border-dark-border-subtle rounded-lg shadow-lg p-6 text-center shadow-slate-950/40">
          <div className="text-sm text-dark-muted mb-2">本週總專注時間</div>
          <div className="text-3xl font-bold text-blue-400">
            {Math.floor(totalWeeklyFocus / 60)} <span className="text-lg">小時</span> {totalWeeklyFocus % 60} <span className="text-lg">分鐘</span>
          </div>
        </div>
        <div className="bg-dark-card border border-dark-border-subtle rounded-lg shadow-lg p-6 text-center shadow-slate-950/40">
          <div className="text-sm text-dark-muted mb-2">本週推進戰役數</div>
          <div className="text-3xl font-bold text-green-400">
            {totalWeeklyTasks} <span className="text-lg">個</span>
          </div>
        </div>
      </div>

      <div className="bg-dark-card border border-dark-border-subtle rounded-lg shadow-lg p-6 mb-8 shadow-slate-950/40">
        <h2 className="text-xl font-semibold mb-4 text-dark-primary">🟩 專注熱力圖 (最近 7 天)</h2>
        <div className="flex items-end justify-center space-x-2">
          {labels.map((label, idx) => (
            <div key={idx} className="flex flex-col items-center group">
              <div 
                className={`w-10 h-10 rounded-md ${getHeatmapColor(sprintCountData[idx])} transition-transform transform group-hover:scale-110 flex items-center justify-center cursor-pointer`}
                title={`${label}: ${sprintCountData[idx]} 個番茄鐘`}
              >
                <span className="text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                  {sprintCountData[idx]}
                </span>
              </div>
              <span className="text-xs text-dark-muted mt-2">{label}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-center items-center space-x-2 text-xs text-dark-muted">
          <span>少</span>
          <div className="w-4 h-4 bg-dark-surface border border-dark-border-default rounded-sm"></div>
          <div className="w-4 h-4 bg-green-950/40 border border-green-900/40 rounded-sm"></div>
          <div className="w-4 h-4 bg-green-900/60 border border-green-800/40 rounded-sm"></div>
          <div className="w-4 h-4 bg-green-700/80 border border-green-600/40 rounded-sm"></div>
          <div className="w-4 h-4 bg-green-600 rounded-sm"></div>
          <span>多</span>
        </div>
      </div>

      <div className="bg-dark-card border border-dark-border-subtle rounded-lg shadow-lg p-6 mb-8 shadow-slate-950/40">
        <Bar options={chartOptions} data={chartData} height={100} />
      </div>

      {/* 導出 Markdown 報告按鈕 */}
      <div className="flex justify-end mb-6">
        <button
          onClick={handleExportReportToMarkdown}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-sm font-semibold shadow-md shadow-blue-950/40 transition-all duration-300 transform hover:scale-105"
        >
          📋 導出 Markdown 工作報告 (週報/日報)
        </button>
      </div>

      {/* 完成任務與番茄數報告區塊 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 今日完成報告 */}
        <div className="bg-dark-card border border-dark-border-subtle rounded-lg shadow-lg p-6 shadow-slate-950/40 hover:shadow-2xl transition-all duration-300">
          <h2 className="text-xl font-bold mb-4 text-green-400 flex items-center gap-2">
            <span>🏆</span> 今日已完成任務
          </h2>
          {completedReport.today.length === 0 ? (
            <div className="text-dark-muted text-sm text-center py-8">今天尚未有已完成的任務紀錄。</div>
          ) : (
            <div className="space-y-3">
              {completedReport.today.map(item => (
                <div key={item.id} className="flex justify-between items-center p-3 border border-green-950/65 bg-green-950/20 hover:bg-green-900/20 rounded-xl transition-colors">
                  <span className="text-dark-primary font-semibold text-sm truncate max-w-[70%]">{item.text}</span>
                  {renderTomatoIcons(item.pomodoros)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 本週完成報告 */}
        <div className="bg-dark-card border border-dark-border-subtle rounded-lg shadow-lg p-6 shadow-slate-950/40 hover:shadow-2xl transition-all duration-300">
          <h2 className="text-xl font-bold mb-4 text-indigo-400 flex items-center gap-2">
            <span>🔥</span> 本週已完成任務
          </h2>
          {completedReport.weekly.length === 0 ? (
            <div className="text-dark-muted text-sm text-center py-8">本週尚未有已完成的任務紀錄。</div>
          ) : (
            <div className="space-y-3">
              {completedReport.weekly.map(item => (
                <div key={item.id} className="flex justify-between items-center p-3 border border-indigo-950/65 bg-indigo-950/20 hover:bg-indigo-900/20 rounded-xl transition-colors">
                  <span className="text-dark-primary font-semibold text-sm truncate max-w-[70%]">{item.text}</span>
                  {renderTomatoIcons(item.pomodoros)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
