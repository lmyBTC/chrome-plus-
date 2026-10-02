export type ActivityCategory = 'network' | 'download' | 'probe' | 'navigation' | 'permission';

export interface ActivityLog {
  id: string;
  category: ActivityCategory;
  timestamp: number;
  tabId?: number | null;
  url?: string;
  domain?: string;
  action?: string;
  api?: string;
  status?: string | number;
  method?: string;
  type?: string;
  filename?: string;
  fileSize?: number;
  mime?: string;
  origin?: string;
  detail?: Record<string, unknown>;
  threatLevel?: 'info' | 'warning' | 'critical';
}

export interface ActivityFilterOptions {
  limit?: number;
  category?: ActivityCategory | null;
  domain?: string;
  startTime?: number;
  endTime?: number;
}

export interface OriginAuditSettings {
  camera?: string;
  microphone?: string;
  location?: string;
  notifications?: string;
  clipboard?: string;
  [key: string]: string | undefined;
}

export interface InspectorStatusResult {
  tabId: number;
  active: boolean;
}
