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
  api: string;
  riskLevel: 'low' | 'medium' | 'high';
  detail: string;
}

export interface ExtensionStatus {
  isInstalled: boolean;
  version?: string;
  mode: 'standalone' | 'fallback';
}
