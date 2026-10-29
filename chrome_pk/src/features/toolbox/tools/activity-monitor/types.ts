/**
 * Activity Monitor Toolbox 轉接介面
 * 橋接至全功能模組 src/features/activity-monitor
 */
export * from '../../../activity-monitor/types';

// 向後相容微工具舊型別
export interface PermissionItem {
  id: string;
  name: string;
  icon: string;
  status: 'granted' | 'denied' | 'prompt' | 'unsupported';
  description: string;
}

export interface ActivityAuditLog {
  id: string;
  timestamp: string;
  source: string;
  sourceType?: 'page' | 'extension' | 'internal' | 'mock';
  domain?: string;
  targetUrl?: string;
  api: string;
  riskLevel: 'low' | 'medium' | 'high';
  detail: string;
}

export interface ExtensionStatus {
  isInstalled: boolean;
  version?: string;
  mode: 'standalone' | 'fallback';
}
