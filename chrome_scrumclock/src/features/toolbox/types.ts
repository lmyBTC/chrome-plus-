export type ToolboxToolId = 'image-scraper';

export interface ToolboxToolInfo {
  id: ToolboxToolId;
  name: string;
  description: string;
  icon: string;
  badge?: string;
}

// Re-export 功能專屬型別以維持相容性
export * from './tools/image-scraper/types';
