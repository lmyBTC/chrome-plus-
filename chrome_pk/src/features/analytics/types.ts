import type { DailyLog, WeeklyMission } from '../../types';

export interface CompletedTaskSummary {
  id: string;
  text: string;
  pomodoros: number;
}

export interface CompletedReport {
  today: CompletedTaskSummary[];
  thisWeek: CompletedTaskSummary[];
}

export type { DailyLog, WeeklyMission };
