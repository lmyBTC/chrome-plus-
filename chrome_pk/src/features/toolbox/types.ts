import React from 'react';

export type ToolboxToolCategory = 'productivity' | 'dev' | 'media' | 'security' | 'finance';

export type ToolboxToolId =
  | 'script-runner'
  | 'image-scraper'
  | 'activity-monitor'
  | 'subtitle-collector'
  | 'finance-watchlist'
  | 'finance-research'
  | string;

export interface IToolManifest {
  id: ToolboxToolId;
  title: string;
  name: string; // 兼容舊版 ToolboxToolInfo.name 與 title 欄位
  shortName?: string;
  description: string;
  icon: string;
  category?: ToolboxToolCategory;
  badge?: string;
  permissions?: string[];
  component: React.ComponentType<{ isSidebar?: boolean }>;
}

export interface ToolboxToolInfo {
  id: ToolboxToolId;
  name: string;
  title?: string;
  shortName?: string;
  description: string;
  icon: string;
  badge?: string;
}

// Re-export 功能專屬型別以維持相容性
export * from './tools/image-scraper/types';
export * from './tools/activity-monitor/types';
export * from './tools/subtitle-collector/types';
export * from './tools/script-runner/types';

