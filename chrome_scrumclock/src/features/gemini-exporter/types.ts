export interface GeminiMessage {
  role: 'user' | 'model';
  content: string;
}

export interface GeminiConversation {
  id: string;
  title: string;
  messages: GeminiMessage[];
  timestamp: number;
}

export interface GeminiWidgetState {
  title: string;
  messageCount: number;
  status: 'idle' | 'syncing' | 'success' | 'error';
  lastSyncTime: number | null;
  activeConversation: GeminiConversation | null;
}
