import type { WeeklyMission, InboxItem, SprintLog } from '../../types';

export type ProjectManagementTab = 'taskPool' | 'inbox' | 'sprintLogs';
export type TaskPriority = 'P0' | 'P1' | 'P2' | 'P3';

export interface ExtendedSprintLog extends SprintLog {
  missionText: string;
}

export type { WeeklyMission, InboxItem, SprintLog };
