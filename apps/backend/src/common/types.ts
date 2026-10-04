export interface IncomingMessage {
  id: string;
  senderName: string;
  content: string;
  timestamp: number;
  isSelf: boolean;
  conversationName?: string;
}

export type PlaywrightStatus = 
  | 'DISCONNECTED' 
  | 'INITIALIZING' 
  | 'WAITING_QR' 
  | 'READY' 
  | 'ERROR';

export interface PersonaProfile {
  name: string;
  tone: string;
  pronouns: {
    self: string;
    customer: string;
  };
  samplePhrases: string[];
  rules: string[];
  backgroundContext?: string;
}

export interface ConversationItem {
  id: string;
  name: string;
  avatar?: string;
  lastMessage?: string;
  time?: string;
  unreadCount?: number;
  isActive?: boolean;
  isMuted?: boolean;
  isGlobalSearch?: boolean;
  phone?: string;
  index?: number;
}

export interface AccountSession {
  id: string;
  name: string;
  avatar?: string;
  sessionPath: string;
  status: PlaywrightStatus;
  lastLogin: number;
  isActive: boolean;
}

export interface AppSettings {
  isGlobalAutoReply: boolean;
  ignoreMutedChats: boolean;
  minKeystrokeDelay: number;
  maxKeystrokeDelay: number;
  replyDelaySeconds: number;
  geminiApiKey: string;
  geminiModel: string;
  systemPromptOverride?: string;
  blacklist: string[];
}
