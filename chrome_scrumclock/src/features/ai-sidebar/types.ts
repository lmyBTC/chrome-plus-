export interface AISidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface AIMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
}

export type AICapabilityStatus = 'checking' | 'yes' | 'no';
