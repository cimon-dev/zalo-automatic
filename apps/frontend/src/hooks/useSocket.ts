'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface MessageItem {
  id: string;
  senderName: string;
  content: string;
  timestamp: number;
  isSelf: boolean;
}

export type PlaywrightStatus = 'DISCONNECTED' | 'INITIALIZING' | 'WAITING_QR' | 'READY' | 'ERROR';

export interface PersonaProfile {
  name: string;
  tone: string;
  pronouns: { self: string; customer: string };
  samplePhrases: string[];
  rules: string[];
  backgroundContext?: string;
}

export interface InterviewQuestion {
  id: number;
  topic: string;
  question: string;
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

const SOCKET_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<PlaywrightStatus>('INITIALIZING');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isAiEnabled, setIsAiEnabled] = useState(false);
  const [isGlobalAutoReply, setIsGlobalAutoReply] = useState(false);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversation, setActiveConversation] = useState<ConversationItem | null>(null);
  const [accounts, setAccounts] = useState<AccountSession[]>([]);
  const [activeAccount, setActiveAccount] = useState<AccountSession | null>(null);
  const [settings, setSettings] = useState<AppSettings>({
    isGlobalAutoReply: false,
    ignoreMutedChats: true,
    minKeystrokeDelay: 35,
    maxKeystrokeDelay: 75,
    replyDelaySeconds: 2,
    geminiApiKey: '',
    geminiModel: 'gemini-3.8-flash',
    systemPromptOverride: '',
    blacklist: [],
  });

  const activeConversationRef = useRef<ConversationItem | null>(null);

  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 15,
      reconnectionDelay: 1500,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Đã kết nối Socket.io với Backend');
      setIsConnected(true);
      socket.emit('get_conversations');
      socket.emit('get_accounts');
      socket.emit('get_settings', (res: any) => {
        if (res?.settings) {
          setSettings(res.settings);
          setIsGlobalAutoReply(res.settings.isGlobalAutoReply);
        }
      });
    });

    socket.on('disconnect', () => {
      console.warn('❌ Mất kết nối Socket.io với Backend');
      setIsConnected(false);
    });

    socket.on('status_change', (data: {
      status: PlaywrightStatus;
      isAiEnabled: boolean;
      isGlobalAutoReply?: boolean;
      qrCode?: string;
      activeAccount?: AccountSession;
    }) => {
      setStatus(data.status);
      if (typeof data.isAiEnabled === 'boolean') {
        setIsAiEnabled(data.isAiEnabled);
      }
      if (typeof data.isGlobalAutoReply === 'boolean') {
        setIsGlobalAutoReply(data.isGlobalAutoReply);
      }
      if (data.qrCode) {
        setQrCode(data.qrCode);
      } else if (data.status === 'READY') {
        setQrCode(null);
      }
      if (data.activeAccount) {
        setActiveAccount(data.activeAccount);
      }
    });

    socket.on('settings_updated', (data: { settings: AppSettings }) => {
      if (data?.settings) {
        setSettings(data.settings);
        setIsGlobalAutoReply(data.settings.isGlobalAutoReply);
      }
    });

    socket.on('qr_code', (data: { qrCode: string }) => {
      setQrCode(data.qrCode);
      setStatus('WAITING_QR');
    });

    socket.on('accounts_updated', (data: { accounts: AccountSession[]; activeAccount: AccountSession }) => {
      setAccounts(data.accounts || []);
      setActiveAccount(data.activeAccount || null);
    });

    socket.on('conversations_updated', (data: { conversations: ConversationItem[] }) => {
      setConversations(data.conversations || []);
      if (data.conversations?.length > 0) {
        const active = data.conversations.find((c) => c.isActive);
        if (active) {
          setActiveConversation((prev) => prev ? { ...prev, ...active } : active);
        }
      }
    });

    socket.on('chat_history', (data: any) => {
      let list: MessageItem[] = [];
      let convName: string | undefined = undefined;
      if (Array.isArray(data)) {
        list = data;
      } else if (data && typeof data === 'object') {
        convName = data.conversationName;
        if (Array.isArray(data.messages)) {
          list = data.messages;
        } else if (Array.isArray(data?.messages?.messages)) {
          list = data.messages.messages;
        }
      }

      const currentActive = activeConversationRef.current;
      if (!currentActive?.name || !convName) return; // Không có hội thoại đang mở hoặc không có convName -> Bỏ qua

      const normalize = (s: string) => (s || '').replace(/[\s\u00a0]+/g, ' ').trim().toLowerCase();
      const normEvent = normalize(convName);
      const normActive = normalize(currentActive.name);

      if (normEvent !== normActive && !normEvent.includes(normActive) && !normActive.includes(normEvent)) {
        return; // Bỏ qua nếu dữ liệu thuộc cuộc hội thoại khác
      }
      setMessages(list);
    });

    socket.on('new_message', (msg: MessageItem & { conversationName?: string }) => {
      const currentActive = activeConversationRef.current;
      const normalize = (s: string) => (s || '').replace(/[\s\u00a0]+/g, ' ').trim().toLowerCase();
      const activeName = normalize(currentActive?.name || '');
      const msgConv = normalize(msg.conversationName || '');
      const msgSender = normalize(msg.senderName || '');

      // Tin nhắn này chỉ thuộc hội thoại hiện tại NẾU có hội thoại đang mở VÀ tên khớp!
      const isCurrentConv =
        activeName.length > 0 &&
        (msgConv === activeName ||
         (msgConv.length > 0 && (msgConv.includes(activeName) || activeName.includes(msgConv))) ||
         (!msg.isSelf && (msgSender === activeName || (msgSender.length > 0 && (msgSender.includes(activeName) || activeName.includes(msgSender))))));

      if (isCurrentConv) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          const isDup = prev.some(
            (m) =>
              m.isSelf === msg.isSelf &&
              m.content.trim() === msg.content.trim() &&
              Math.abs(m.timestamp - msg.timestamp) < 3000
          );
          if (isDup) return prev;
          return [...prev, msg];
        });
      }

      // Cập nhật lại danh sách hội thoại và đưa hội thoại có tin nhắn mới lên đầu
      setConversations((prev) => {
        const targetConvName = msg.conversationName || (!msg.isSelf ? msg.senderName : '');
        if (!targetConvName) return prev;
        const normTarget = normalize(targetConvName);

        const exists = prev.find((c) => {
          const cNorm = normalize(c.name);
          return cNorm === normTarget || cNorm.includes(normTarget) || normTarget.includes(cNorm);
        });

        if (exists) {
          const updated = prev.map((c) => {
            const cNorm = normalize(c.name);
            const matches = cNorm === normTarget || cNorm.includes(normTarget) || normTarget.includes(cNorm);
            if (matches) {
              return {
                ...c,
                lastMessage: msg.content,
                time: 'Vừa xong',
                unreadCount: isCurrentConv || msg.isSelf ? 0 : (c.unreadCount || 0) + 1,
              };
            }
            return c;
          });
          const target = updated.find((c) => {
            const cNorm = normalize(c.name);
            return cNorm === normTarget || cNorm.includes(normTarget) || normTarget.includes(cNorm);
          })!;
          return [target, ...updated.filter((c) => c !== target)];
        }
        return prev;
      });
    });

    socket.on('ai_typing', (data: { isTyping: boolean }) => {
      setIsAiTyping(data.isTyping);
    });

    socket.on('ai_mode_updated', (data: { isAiEnabled: boolean }) => {
      setIsAiEnabled(data.isAiEnabled);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const toggleAi = useCallback((enabled: boolean) => {
    socketRef.current?.emit('toggle_ai', { enabled });
    setIsAiEnabled(enabled);
  }, []);

  const toggleGlobalAi = useCallback((enabled: boolean) => {
    socketRef.current?.emit('toggle_global_ai', { enabled });
    setIsGlobalAutoReply(enabled);
    setSettings((prev) => ({ ...prev, isGlobalAutoReply: enabled }));
  }, []);

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    socketRef.current?.emit('update_settings', partial, (res: any) => {
      if (res?.settings) {
        setSettings(res.settings);
        setIsGlobalAutoReply(res.settings.isGlobalAutoReply);
      }
    });
  }, []);

  const scanRecentUnread = useCallback(() => {
    socketRef.current?.emit('scan_recent_unread');
  }, []);

  const sendManualMessage = useCallback((content: string) => {
    if (!content.trim()) return;
    socketRef.current?.emit('send_manual_message', { content });
  }, []);

  const selectConversation = useCallback((conv: ConversationItem, index?: number) => {
    setActiveConversation(conv);
    activeConversationRef.current = conv;

    // Xóa ngay badge unread trên UI
    setConversations((prev) =>
      prev.map((c) => (c.name === conv.name ? { ...c, unreadCount: 0 } : c))
    );

    // Lấy ngay lịch sử chat đã lưu trong backend (đồng thời làm mới màn hình, tránh giữ tin nhắn của hội thoại cũ)
    socketRef.current?.emit('get_chat_history', { conversationName: conv.name }, (res: any) => {
      const currentActiveNow = activeConversationRef.current;
      const normalize = (s: string) => (s || '').replace(/[\s\u00a0]+/g, ' ').trim().toLowerCase();
      if (!currentActiveNow || normalize(currentActiveNow.name) !== normalize(conv.name)) {
        return; // Người dùng đã chuyển sang hội thoại khác
      }

      let msgs: MessageItem[] = [];
      if (Array.isArray(res)) {
        msgs = res;
      } else if (Array.isArray(res?.messages)) {
        msgs = res.messages;
      } else if (Array.isArray(res?.messages?.messages)) {
        msgs = res.messages.messages;
      }

      setMessages(msgs);
    });

    socketRef.current?.emit(
      'select_conversation',
      {
        id: conv.id,
        name: conv.name,
        phone: conv.phone,
        isGlobalSearch: conv.isGlobalSearch,
        index: typeof index === 'number' ? index : conv.index,
      },
      (res: any) => {
        const currentActiveNow = activeConversationRef.current;
        const normalize = (s: string) => (s || '').replace(/[\s\u00a0]+/g, ' ').trim().toLowerCase();
        if (!currentActiveNow || normalize(currentActiveNow.name) !== normalize(conv.name)) {
          return; // Người dùng đã chuyển sang hội thoại khác
        }
        if (res?.messages && Array.isArray(res.messages) && res.messages.length > 0) {
          setMessages(res.messages);
        }
      }
    );
  }, []);

  const searchZalo = useCallback((query: string) => {
    socketRef.current?.emit('search_zalo', { query }, (res: any) => {
      if (res?.conversations) setConversations(res.conversations);
    });
  }, []);

  const switchAccount = useCallback((accountId: string) => {
    setMessages([]);
    setConversations([]);
    setActiveConversation(null);
    socketRef.current?.emit('switch_account', { accountId });
  }, []);

  const addAccount = useCallback((name?: string) => {
    setMessages([]);
    setConversations([]);
    setActiveConversation(null);
    socketRef.current?.emit('add_account', { name });
  }, []);

  const logoutCurrentAccount = useCallback(() => {
    setMessages([]);
    setConversations([]);
    setActiveConversation(null);
    socketRef.current?.emit('logout_current_account');
  }, []);

  const refreshQr = useCallback(() => {
    socketRef.current?.emit('refresh_qr');
  }, []);

  const getPersonaData = useCallback((): Promise<{ profile: PersonaProfile; questions: InterviewQuestion[] }> => {
    return new Promise((resolve) => {
      if (!socketRef.current) return;
      socketRef.current.emit('get_persona_data', (res: any) => {
        resolve(res);
      });
    });
  }, []);

  const submitInterview = useCallback((answers: { question: string; answer: string }[]): Promise<any> => {
    return new Promise((resolve) => {
      if (!socketRef.current) return;
      socketRef.current.emit('submit_interview', { answers }, (res: any) => {
        resolve(res);
      });
    });
  }, []);

  return {
    isConnected,
    status,
    qrCode,
    isAiEnabled,
    isGlobalAutoReply,
    settings,
    isAiTyping,
    messages,
    conversations,
    activeConversation,
    accounts,
    activeAccount,
    toggleAi,
    toggleGlobalAi,
    updateSettings,
    scanRecentUnread,
    sendManualMessage,
    selectConversation,
    searchZalo,
    switchAccount,
    addAccount,
    logoutCurrentAccount,
    refreshQr,
    getPersonaData,
    submitInterview,
  };
}
