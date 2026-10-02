export type ToolboxToolId = 'image-scraper' | 'activity-monitor' | 'subtitle-collector' | 'finance-research';

export interface ToolboxToolInfo {
  id: ToolboxToolId;
  name: string;
  shortName?: string;
  description: string;
  icon: string;
  badge?: string;
}

// Re-export 功能專屬型別以維持相容性
export * from './tools/image-scraper/types';
export * from './tools/activity-monitor/types';
export * from './tools/subtitle-collector/types';

