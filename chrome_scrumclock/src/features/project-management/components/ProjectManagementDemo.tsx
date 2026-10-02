import React, { useState } from 'react';
import { TaskPoolTab } from './tabs/TaskPoolTab';
import { InboxTab } from './tabs/InboxTab';
import { SprintLogsTab } from './tabs/SprintLogsTab';
import { SyncSettingsModal } from './modals/SyncSettingsModal';
import { StandupModal } from './modals/StandupModal';
import { useProjectManagement } from '../hooks/useProjectManagement';

type Tab = 'taskPool' | 'inbox' | 'sprintLogs';

export const ProjectManagementDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('taskPool');
  const [isStandupOpen, setIsStandupOpen] = useState(false);
  const pm = useProjectManagement();

  return (
    <div className="max-w-6xl mx-auto p-8 font-sans">
      <SyncSettingsModal
        isOpen={pm.syncModal.open}
        onClose={() => pm.setSyncModal({ open: false })}
        onSmartMerge={pm.doSmartMerge}
        onFullPull={pm.doFullPull}
        onPushToSheet={pm.doPushToSheet}
      />

      <StandupModal
        isOpen={isStandupOpen}
        onClose={() => setIsStandupOpen(false)}
        weeklyMissions={pm.weeklyMissions}
        inProgressIds={pm.inProgressIds}
        sprintLogs={pm.sprintLogs}
      />

      {pm.syncFeedback && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold border backdrop-blur-md transition-all ${
            pm.syncFeedback.type === 'success'
              ? 'bg-emerald-900/80 border-emerald-600/50 text-emerald-200'
              : 'bg-red-900/80 border-red-600/50 text-red-200'
          }`}
        >
          {pm.syncFeedback.text}
        </div>
      )}

      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-dark-primary tracking-tight">專案管理儀表板</h1>
          <p className="text-dark-muted mt-2">基於 Chrome Local Storage 與 Google Sheets/Notion 的單一資料庫實時同步</p>
          {pm.northStarText && pm.northStarText !== '設定你的北極星目標' && (
            <div className="mt-3 flex items-center gap-2 px-4 py-2 bg-indigo-950/50 border border-indigo-800/40 rounded-xl w-fit">
              <span className="text-lg">🌟</span>
              <span className="text-sm font-semibold text-indigo-300">{pm.northStarText}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={pm.handleSyncGoogleTasks}
            disabled={pm.isGoogleSyncing}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold border transition-all flex items-center gap-2 shadow-md ${
              pm.isGoogleSyncing
                ? 'bg-dark-surface border-dark-border-subtle text-dark-muted cursor-not-allowed'
                : 'bg-emerald-600/10 hover:bg-emerald-600/20 border-emerald-500/30 hover:border-emerald-500/50 text-emerald-400'
            }`}
            title="雙向同步 Google Tasks"
          >
            {pm.isGoogleSyncing ? (
              <>
                <span className="animate-spin block h-4 w-4 border-2 border-dark-muted border-t-transparent rounded-full"></span>
                <span>Tasks 同步中...</span>
              </>
            ) : (
              <>
                <span>📋</span>
                <span>同步 Google Tasks</span>
              </>
            )}
          </button>
          <button
            onClick={pm.handleSync}
            disabled={pm.isSyncing}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold border transition-all flex items-center gap-2 shadow-md ${
              pm.isSyncing
                ? 'bg-dark-surface border-dark-border-subtle text-dark-muted cursor-not-allowed'
                : 'bg-blue-600/10 hover:bg-blue-600/20 border-blue-500/30 hover:border-blue-500/50 text-blue-400'
            }`}
          >
            {pm.isSyncing ? (
              <>
                <span className="animate-spin block h-4 w-4 border-2 border-dark-muted border-t-transparent rounded-full"></span>
                <span>同步中...</span>
              </>
            ) : (
              <>
                <span>🔄</span>
                <span>同步試算表任務</span>
              </>
            )}
          </button>
          <button
            onClick={() => setIsStandupOpen(true)}
            className="px-4 py-2.5 rounded-lg text-sm font-semibold border transition-all flex items-center gap-2 shadow-md bg-purple-600/10 hover:bg-purple-600/20 border-purple-500/30 hover:border-purple-500/50 text-purple-300"
            title="每日站會 Copilot (Markdown / 富文本導出)"
          >
            <span>📢</span>
            <span>站會 Copilot</span>
          </button>
          <div className="text-xs px-3.5 py-2 bg-indigo-950/40 text-indigo-400 rounded-full font-semibold border border-indigo-900/40 flex items-center gap-1.5 shadow-md">
            <span>✨</span>
            <span>Gemini 同步大腦已上線</span>
          </div>
        </div>
      </div>

      <div className="flex space-x-1 bg-dark-surface p-1 rounded-xl mb-8 w-fit border border-dark-border-subtle">
        <button
          onClick={() => setActiveTab('taskPool')}
          className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'taskPool'
              ? 'bg-dark-card text-dark-primary shadow-md border border-dark-border-subtle/50'
              : 'text-dark-secondary hover:text-dark-primary'
          }`}
        >
          🗂️ 任務池 (Task Pool) ({pm.weeklyMissions.length})
        </button>
        <button
          onClick={() => setActiveTab('inbox')}
          className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'inbox'
              ? 'bg-dark-card text-dark-primary shadow-md border border-dark-border-subtle/50'
              : 'text-dark-secondary hover:text-dark-primary'
          }`}
        >
          📥 收件匣 (Inbox) ({pm.inboxItems.length})
        </button>
        <button
          onClick={() => setActiveTab('sprintLogs')}
          className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'sprintLogs'
              ? 'bg-dark-card text-dark-primary shadow-md border border-dark-border-subtle/50'
              : 'text-dark-secondary hover:text-dark-primary'
          }`}
        >
          ⏱️ 番茄鐘日誌 (Sprint Logs) ({pm.sprintLogs.length})
        </button>
      </div>

      <div className="bg-dark-card rounded-2xl shadow-lg border border-dark-border-subtle overflow-hidden">
        {activeTab === 'taskPool' && (
          <TaskPoolTab
            weeklyMissions={pm.weeklyMissions}
            inProgressIds={pm.inProgressIds}
            visibleColumns={pm.visibleColumns}
            setVisibleColumns={pm.setVisibleColumns}
            newTitle={pm.newTitle}
            setNewTitle={pm.setNewTitle}
            newPriority={pm.newPriority}
            setNewPriority={pm.setNewPriority}
            notesInputs={pm.notesInputs}
            breakingDownId={pm.breakingDownId}
            subtasks={pm.subtasks}
            onAddTask={pm.handleAddTask}
            onDeleteTask={pm.handleDeleteTask}
            onUpdateStatus={pm.handleUpdateStatus}
            onUpdatePriority={pm.handleUpdatePriority}
            onNotesChange={pm.handleNotesChange}
            onUpdateNotes={pm.handleUpdateNotes}
            onToggleFocus={pm.handleToggleFocus}
            onBreakdownTask={pm.handleBreakdownTask}
            onApplySubtasks={pm.handleApplySubtasks}
            onDismissSubtasks={pm.handleDismissSubtasks}
            onUpdateTitle={pm.handleUpdateTitle}
            onBatchPushToFocus={pm.handleBatchPushToFocus}
            onBatchUpdateStatus={pm.handleBatchUpdateStatus}
            onBatchDelete={pm.handleBatchDelete}
            onSyncGoogleTasks={pm.handleSyncGoogleTasks}
            isGoogleSyncing={pm.isGoogleSyncing}
            onScheduleTimebox={pm.handleScheduleTimebox}
            isSchedulingCalendar={pm.isSchedulingCalendar}
            onUpdatePomodoroEstimate={pm.handleUpdatePomodoroEstimate}
          />
        )}

        {activeTab === 'inbox' && (
          <InboxTab
            inboxItems={pm.inboxItems}
            onConvertInbox={pm.handleConvertInbox}
            onDeleteInbox={pm.handleDeleteInbox}
            onAddInboxItem={pm.handleAddInboxItem}
          />
        )}

        {activeTab === 'sprintLogs' && (
          <SprintLogsTab sprintLogs={pm.sprintLogs} />
        )}
      </div>

      <div className="mt-8 bg-blue-950/20 border border-blue-900/40 rounded-xl p-6 text-sm text-blue-300">
        <h3 className="font-bold mb-2 flex items-center gap-2">
          <span>ℹ️</span> 專案規劃看板職責與同步機制說明
        </h3>
        <p className="opacity-90 leading-relaxed text-dark-secondary">
          專案規劃看板為所有待辦項目的 <strong>單一真理源 (Backlog SSOT)</strong>。
          在此您可以集中整理每週任務池、透過 <strong>「🎯 推入今日」</strong> 派送任務至番茄鐘進行當日 25 分鐘衝刺；
          針對龐大專案可運用 <strong>「✨ AI 拆解」</strong> 一鍵細化為子任務；
          零碎想法則存放於 <strong>收件匣 (Inbox)</strong> 隨時轉為任務。
          所有狀態與衝刺成果會即時記錄於 <strong>番茄鐘日誌 (Sprint Logs)</strong> 並支援 Google Sheets / Notion 雙向雲端同步！
        </p>
      </div>
    </div>
  );
};