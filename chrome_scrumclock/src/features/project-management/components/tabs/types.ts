import { WeeklyMission, InboxItem, SprintLog, ChecklistItem } from '../../../../types';

export interface DashboardColumns {
  taskId: boolean;
  title: boolean;
  status: boolean;
  priority: boolean;
  notes: boolean;
  createdAt: boolean;
}

export type SprintLogWithMission = SprintLog & {
  missionText: string;
  missionUrl?: string;
  priority?: 'P0' | 'P1' | 'P2' | 'P3';
};

export interface TaskPoolTabProps {
  weeklyMissions: WeeklyMission[];
  inProgressIds: string[];
  visibleColumns: DashboardColumns;
  setVisibleColumns: React.Dispatch<React.SetStateAction<DashboardColumns>>;
  newTitle: string;
  setNewTitle: (val: string) => void;
  newPriority: 'P0' | 'P1' | 'P2' | 'P3';
  setNewPriority: (val: 'P0' | 'P1' | 'P2' | 'P3') => void;
  notesInputs: Record<string, string>;
  breakingDownId?: string | null;
  subtasks?: Record<string, string[]>;
  onAddTask: () => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onUpdateStatus: (id: string, statusText: string) => Promise<void>;
  onUpdatePriority: (id: string, priority: 'P0' | 'P1' | 'P2' | 'P3') => Promise<void>;
  onNotesChange: (id: string, value: string) => void;
  onUpdateNotes: (id: string) => Promise<void>;
  onToggleFocus: (id: string) => Promise<void>;
  onBreakdownTask: (id: string) => Promise<void>;
  onApplySubtasks: (id: string) => Promise<void>;
  onDismissSubtasks: (id: string) => void;
  onUpdateTitle?: (id: string, title: string) => Promise<void>;
  selectedTaskId?: string | null;
  onSelectTask?: (id: string | null) => void;
  onBatchPushToFocus?: (ids: string[]) => Promise<void>;
  onBatchUpdateStatus?: (ids: string[], status: 'TODO' | 'DONE') => Promise<void>;
  onBatchDelete?: (ids: string[]) => Promise<void>;
  onSyncGoogleTasks?: () => Promise<void>;
  isGoogleSyncing?: boolean;
  onScheduleTimebox?: (taskId: string, startTime: string | number | Date, durationMinutes: number) => Promise<boolean>;
  isSchedulingCalendar?: boolean;
  onUpdatePomodoroEstimate?: (id: string, estimate: number) => Promise<void>;
  onUpdateChecklist?: (id: string, checklist: ChecklistItem[]) => Promise<void>;
}

export interface InboxTabProps {
  inboxItems: InboxItem[];
  onConvertInbox: (item: InboxItem) => Promise<void>;
  onDeleteInbox: (id: string) => Promise<void>;
  onAddInboxItem: (text: string) => Promise<void>;
}

export interface SprintLogsTabProps {
  sprintLogs: SprintLogWithMission[];
  weeklyMissions?: WeeklyMission[];
}

export interface SyncSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSmartMerge: () => Promise<void>;
  onFullPull: () => Promise<void>;
  onPushToSheet: () => Promise<void>;
}
