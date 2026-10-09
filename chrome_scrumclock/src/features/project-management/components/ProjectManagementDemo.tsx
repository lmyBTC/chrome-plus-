import React, { useState } from 'react';
import { TaskPoolTab } from './tabs/TaskPoolTab';
import { InboxTab } from './tabs/InboxTab';
import { SprintLogsTab } from './tabs/SprintLogsTab';
import { SyncSettingsModal } from './modals/SyncSettingsModal';
import { StandupModal } from './modals/StandupModal';
import { InboxTriageModal } from './modals/InboxTriageModal';
import { useProjectManagement } from '../hooks/useProjectManagement';

type Tab = 'taskPool' | 'inbox' | 'sprintLogs';

export const ProjectManagementDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('taskPool');
  const [isStandupOpen, setIsStandupOpen] = useState(false);
  const pm = useProjectManagement();

  return (
    <div className="max-w-[1680px] w-full mx-auto px-6 py-6 font-sans">
      <InboxTriageModal
        isOpen={pm.isTriageModalOpen}
        onClose={() => pm.setIsTriageModalOpen(false)}
        proposals={pm.triageProposals}
        weeklyMissions={pm.weeklyMissions}
        onApply={pm.handleApplyTriageProposals}
      />

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

      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-dark-primary tracking-tight">專案管理儀表板</h1>
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm">
              <span>✨</span>
              <span>Gemini 大腦已上線</span>
            </div>
          </div>
          <p className="text-dark-muted mt-1.5 text-sm">基於 Chrome Local Storage 與 Google Sheets/Notion 的單一資料庫實時同步</p>
          {pm.northStarText && pm.northStarText !== '設定你的北極星目標' && (
            <div className="mt-2.5 flex items-center gap-2 px-3 py-1.5 bg-indigo-950/40 border border-indigo-800/40 rounded-lg w-fit text-xs font-medium text-indigo-300">
              <span className="text-sm">🌟</span>
              <span>{pm.northStarText}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={pm.handleSyncGoogleTasks}
            disabled={pm.isGoogleSyncing}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all flex items-center gap-2 shadow-sm ${
              pm.isGoogleSyncing
                ? 'bg-dark-surface border-dark-border-subtle text-dark-muted cursor-not-allowed'
                : 'bg-emerald-600/10 hover:bg-emerald-600/20 border-emerald-500/30 hover:border-emerald-500/50 text-emerald-400'
            }`}
            title="雙向同步 Google Tasks"
          >
            {pm.isGoogleSyncing ? (
              <>
                <span className="animate-spin block h-3.5 w-3.5 border-2 border-dark-muted border-t-transparent rounded-full"></span>
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
            className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-all flex items-center gap-2 shadow-sm ${
              pm.isSyncing
                ? 'bg-dark-surface border-dark-border-subtle text-dark-muted cursor-not-allowed'
                : 'bg-blue-600/10 hover:bg-blue-600/20 border-blue-500/30 hover:border-blue-500/50 text-blue-400'
            }`}
          >
            {pm.isSyncing ? (
              <>
                <span className="animate-spin block h-3.5 w-3.5 border-2 border-dark-muted border-t-transparent rounded-full"></span>
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
            className="px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all flex items-center gap-2 shadow-sm bg-purple-600/10 hover:bg-purple-600/20 border-purple-500/30 hover:border-purple-500/50 text-purple-300"
            title="每日站會 Copilot (Markdown / 富文本導出)"
          >
            <span>📢</span>
            <span>站會 Copilot</span>
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-1.5 bg-dark-surface/80 p-1.5 rounded-xl mb-6 w-fit border border-dark-border-subtle/80 shadow-inner">
        <button
          onClick={() => setActiveTab('taskPool')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'taskPool'
              ? 'bg-dark-card text-dark-primary shadow-sm border border-dark-border-subtle'
              : 'text-dark-secondary hover:text-dark-primary hover:bg-dark-surface/50'
          }`}
        >
          <span>🗂️ 任務池 (Task Pool)</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-mono transition-colors ${
            activeTab === 'taskPool'
              ? 'bg-indigo-500/20 text-indigo-300 font-bold'
              : 'bg-dark-surface text-dark-muted'
          }`}>
            {pm.weeklyMissions.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('inbox')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'inbox'
              ? 'bg-dark-card text-dark-primary shadow-sm border border-dark-border-subtle'
              : 'text-dark-secondary hover:text-dark-primary hover:bg-dark-surface/50'
          }`}
        >
          <span>📥 收件匣 (Inbox)</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-mono transition-colors ${
            activeTab === 'inbox'
              ? 'bg-indigo-500/20 text-indigo-300 font-bold'
              : 'bg-dark-surface text-dark-muted'
          }`}>
            {pm.inboxItems.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('sprintLogs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'sprintLogs'
              ? 'bg-dark-card text-dark-primary shadow-sm border border-dark-border-subtle'
              : 'text-dark-secondary hover:text-dark-primary hover:bg-dark-surface/50'
          }`}
        >
          <span>⏱️ 番茄鐘日誌 (Sprint Logs)</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-mono transition-colors ${
            activeTab === 'sprintLogs'
              ? 'bg-indigo-500/20 text-indigo-300 font-bold'
              : 'bg-dark-surface text-dark-muted'
          }`}>
            {pm.sprintLogs.length}
          </span>
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
            onUpdateChecklist={pm.handleUpdateChecklist}
            onTriageInbox={pm.handleTriageInbox}
            isTriagingInbox={pm.isTriagingInbox}
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
          <SprintLogsTab sprintLogs={pm.sprintLogs} weeklyMissions={pm.weeklyMissions} />
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