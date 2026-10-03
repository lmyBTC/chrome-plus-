/**
 * taskContracts.ts - Chrome Plus 跨插件通訊與通用任務契約型別定義 (v2.3)
 * SSOT 規範定義於 0.doc_mg/docs/cross_plugin_contract.md
 */

export type GTDContext = '@Focus' | '@Meeting' | '@Review' | '@Waiting-For' | '@Blocked';
export type GTDStatus = 'inbox' | 'next-action' | 'in-progress' | 'done' | 'someday';

export interface UniversalTaskPayload {
  protocolVersion?: 2;
  id?: string;
  title: string;
  ticker?: string;
  notes?: string;
  tags?: string[];
  estimatedPomodoros?: number;
  spentPomodoros?: number;
  status?: GTDStatus;
  url?: string;
  gtdContext?: GTDContext;
  priority?: 'P0' | 'P1' | 'P2' | 'P3';
  sourcePlugin?: 'FINANCE_CLIPPER' | 'VIDEO_SPEED_PLUS' | 'ACTIVITY_MONITOR' | 'SCRUMCLOCK' | string;
  createdAt?: number;
}

export interface AckResponse<T = any> {
  success: boolean;
  ack: boolean;
  taskId?: string;
  noteId?: string;
  data?: T;
  error?: string;
  timestamp?: number;
}

