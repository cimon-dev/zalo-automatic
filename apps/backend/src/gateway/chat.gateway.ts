import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { PlaywrightService } from '../automation/playwright.service';
import { AccountService } from '../automation/account.service';
import { SettingsService } from '../automation/settings.service';
import { GeminiService } from '../ai/gemini.service';
import { PersonaService } from '../ai/persona.service';
import { AppSettings, ConversationItem, IncomingMessage, PlaywrightStatus } from '../common/types';
import { ChatStoreService } from '../automation/chat-store.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private isAiAutoReply = false;
  private lastQrCode: string | null = null;
  private latestConversations: ConversationItem[] = [];
  private isScanningUnread = false;

  constructor(
    private readonly playwrightService: PlaywrightService,
    private readonly accountService: AccountService,
    private readonly settingsService: SettingsService,
    private readonly chatStoreService: ChatStoreService,
    private readonly geminiService: GeminiService,
    private readonly personaService: PersonaService,
  ) {
    this.registerPlaywrightEvents();
  }

  handleConnection(client: Socket) {
    this.logger.log(`Frontend Client đã kết nối: ${client.id}`);
    const settings = this.settingsService.getSettings();

    // Gửi ngay trạng thái hiện tại, danh sách tài khoản, cài đặt cho Client
    client.emit('status_change', {
      status: this.playwrightService.getStatus(),
      isAiEnabled: this.isAiAutoReply,
      isGlobalAutoReply: settings.isGlobalAutoReply,
      qrCode: this.lastQrCode,
      activeAccount: this.accountService.getActiveAccount(),
    });

    client.emit('settings_updated', { settings });

    client.emit('accounts_updated', {
      accounts: this.accountService.getAccounts(),
      activeAccount: this.accountService.getActiveAccount(),
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Frontend Client đã ngắt kết nối: ${client.id}`);
  }

  private registerPlaywrightEvents() {
    this.playwrightService.on('status_change', (status: PlaywrightStatus) => {
      this.logger.log(`Trạng thái Playwright đổi thành: ${status}`);
      if (status === 'READY') {
        this.lastQrCode = null;
      }
      const settings = this.settingsService.getSettings();
      this.server?.emit('status_change', {
        status,
        isAiEnabled: this.isAiAutoReply,
        isGlobalAutoReply: settings.isGlobalAutoReply,
        qrCode: this.lastQrCode,
        activeAccount: this.accountService.getActiveAccount(),
      });
      this.server?.emit('accounts_updated', {
        accounts: this.accountService.getAccounts(),
        activeAccount: this.accountService.getActiveAccount(),
      });
    });

    this.playwrightService.on('qr_code', (base64Image: string) => {
      this.lastQrCode = base64Image;
      this.server?.emit('qr_code', { qrCode: base64Image });
    });

    this.playwrightService.on('conversations_updated', (conversations: ConversationItem[]) => {
      this.latestConversations = conversations;
      this.server?.emit('conversations_updated', { conversations });
    });

    this.playwrightService.on('chat_history', (data: any) => {
      let list: IncomingMessage[] = [];
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
      this.server?.emit('chat_history', { conversationName: convName, messages: list });
    });

    this.playwrightService.on('incoming_message', async (msg: IncomingMessage) => {
      this.server?.emit('new_message', msg);

      // Kiểm tra xem có kích hoạt AI Auto-Reply không
      if (!msg.isSelf) {
        const settings = this.settingsService.getSettings();
        const shouldReplyGlobal = settings.isGlobalAutoReply;
        const shouldReplyCurrent = this.isAiAutoReply && msg.conversationName === this.playwrightService.getActiveConversationName();

        if (shouldReplyGlobal || shouldReplyCurrent) {
          const targetConvName = msg.conversationName || msg.senderName;
          const conv = this.latestConversations.find((c) => c.name === targetConvName);

          // 1. Kiểm tra quy tắc loại trừ: Bỏ qua hội thoại Tắt thông báo
          if (settings.ignoreMutedChats && conv?.isMuted) {
            this.logger.log(`[AI Auto-Reply] BỎ QUA hội thoại "${targetConvName}" vì có icon Tắt thông báo 🔕`);
            return;
          }

          // 2. Kiểm tra Blacklist
          if (this.settingsService.isBlacklisted(targetConvName)) {
            this.logger.log(`[AI Auto-Reply] BỎ QUA hội thoại "${targetConvName}" vì nằm trong danh sách loại trừ (Blacklist)`);
            return;
          }

          this.logger.log(`[AI Auto-Reply 100%] Bắt đầu phản hồi tự động cho "${targetConvName}": "${msg.content}"`);

          try {
            // Delay tự nhiên theo cài đặt trước khi gửi
            if (settings.replyDelaySeconds > 0) {
              await new Promise((r) => setTimeout(r, settings.replyDelaySeconds * 1000));
            }

            this.server?.emit('ai_typing', { isTyping: true, recipient: targetConvName });
            const replyText = await this.geminiService.generateReply(msg.senderName || targetConvName, msg.content);

            // Nếu hội thoại này chưa được mở trên Zalo, chọn nó trước khi gửi
            if (this.playwrightService.getActiveConversationName() !== targetConvName) {
              await this.playwrightService.selectConversation(targetConvName);
              await new Promise((r) => setTimeout(r, 600));
            }

            const sent = await this.playwrightService.sendMessage(replyText, 'Bạn (Gemini Tự động)');
            this.server?.emit('ai_typing', { isTyping: false });

            if (sent) {
              this.logger.log(`[AI Auto-Reply 100%] ĐÃ GỬI PHẢN HỒI THÀNH CÔNG cho "${targetConvName}": "${replyText}"`);
            }
          } catch (err) {
            this.logger.error(`Lỗi trong luồng AI Auto-Reply: ${err.message}`);
            this.server?.emit('ai_typing', { isTyping: false });
          }
        }
      }
    });
  }

  /**
   * Quét các tin nhắn gần đây và tự động trả lời tất cả các đoạn chat chưa đọc (trừ chat tắt chuông)
   */
  async scanAndReplyRecentUnreadChats() {
    if (this.isScanningUnread) return;
    this.isScanningUnread = true;

    try {
      this.logger.log('[AI Auto-Reply 100%] Đang bắt đầu quét các hội thoại có tin nhắn mới gần đây...');
      const settings = this.settingsService.getSettings();
      const conversations = await this.playwrightService.syncConversations();

      const unreadList = conversations.filter((c) => {
        if (!c.unreadCount || c.unreadCount === 0) return false;
        if (settings.ignoreMutedChats && c.isMuted) return false;
        if (this.settingsService.isBlacklisted(c.name)) return false;
        return true;
      });

      this.logger.log(`[AI Auto-Reply 100%] Tìm thấy ${unreadList.length} hội thoại chưa đọc đủ điều kiện trả lời.`);

      for (const conv of unreadList) {
        if (!settings.isGlobalAutoReply) {
          this.logger.log('[AI Auto-Reply 100%] Đã tắt chế độ, dừng quét.');
          break;
        }

        this.logger.log(`[AI Auto-Reply 100%] Đang mở hội thoại: "${conv.name}" (Unread: ${conv.unreadCount})`);
        await this.playwrightService.selectConversation(conv);
        await new Promise((r) => setTimeout(r, 1000));

        const msgs = this.chatStoreService.getMessages(conv.name);
        const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;

        // Chỉ trả lời nếu tin nhắn cuối cùng là từ khách hàng (chưa được mình phản hồi)
        if (lastMsg && !lastMsg.isSelf && lastMsg.content) {
          this.server?.emit('ai_typing', { isTyping: true, recipient: conv.name });
          const reply = await this.geminiService.generateReply(conv.name, lastMsg.content);
          await this.playwrightService.sendMessage(reply, 'Bạn (Gemini Tự động)');
          this.server?.emit('ai_typing', { isTyping: false });
          this.logger.log(`[AI Auto-Reply 100%] Đã tự động trả lời hội thoại "${conv.name}": "${reply}"`);

          // Chờ 2 giây trước khi sang hội thoại tiếp theo để tránh bị Zalo giới hạn
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
    } catch (err) {
      this.logger.error(`Lỗi khi quét & trả lời tin nhắn chưa đọc: ${err.message}`);
    } finally {
      this.isScanningUnread = false;
    }
  }

  @SubscribeMessage('toggle_ai')
  handleToggleAi(@MessageBody() payload: { enabled: boolean }) {
    this.isAiAutoReply = payload.enabled;
    this.logger.log(`Chế độ AI Tự động trả lời hội thoại hiện tại: ${this.isAiAutoReply ? 'ĐÃ BẬT 🟢' : 'ĐÃ TẮT 🔴'}`);
    this.server.emit('ai_mode_updated', { isAiEnabled: this.isAiAutoReply });
    return { success: true, isAiEnabled: this.isAiAutoReply };
  }

  @SubscribeMessage('toggle_global_ai')
  async handleToggleGlobalAi(@MessageBody() payload: { enabled: boolean }) {
    const updated = this.settingsService.updateSettings({ isGlobalAutoReply: payload.enabled });
    this.logger.log(`Chế độ Tự động trả lời 100% (Tất cả hội thoại): ${payload.enabled ? 'ĐÃ BẬT 🟢' : 'ĐÃ TẮT 🔴'}`);
    this.server.emit('settings_updated', { settings: updated });
    this.server.emit('status_change', {
      status: this.playwrightService.getStatus(),
      isAiEnabled: this.isAiAutoReply,
      isGlobalAutoReply: updated.isGlobalAutoReply,
      activeAccount: this.accountService.getActiveAccount(),
    });

    if (payload.enabled) {
      // Kích hoạt quét và trả lời các hội thoại chưa đọc gần đây
      setTimeout(() => this.scanAndReplyRecentUnreadChats(), 1000);
    }

    return { success: true, settings: updated };
  }

  @SubscribeMessage('get_settings')
  handleGetSettings() {
    return { settings: this.settingsService.getSettings() };
  }

  @SubscribeMessage('update_settings')
  handleUpdateSettings(@MessageBody() payload: Partial<AppSettings>) {
    const updated = this.settingsService.updateSettings(payload);
    this.server.emit('settings_updated', { settings: updated });
    return { success: true, settings: updated };
  }

  @SubscribeMessage('scan_recent_unread')
  async handleScanRecentUnread() {
    this.scanAndReplyRecentUnreadChats();
    return { success: true, message: 'Đang bắt đầu quét tin nhắn chưa đọc...' };
  }

  @SubscribeMessage('send_manual_message')
  async handleManualMessage(@MessageBody() payload: { content: string }) {
    if (!payload.content) return { success: false, error: 'Tin nhắn trống' };

    this.logger.log(`Gửi tin thủ công từ Web UI: "${payload.content}"`);
    const sent = await this.playwrightService.sendMessage(payload.content, 'Tôi (Thủ công)');
    return { success: sent };
  }

  @SubscribeMessage('get_conversations')
  async handleGetConversations() {
    const list = await this.playwrightService.syncConversations();
    this.latestConversations = list;
    return { conversations: list };
  }

  @SubscribeMessage('select_conversation')
  async handleSelectConversation(@MessageBody() payload: { id: string; name?: string; phone?: string; isGlobalSearch?: boolean; index?: number }) {
    const ok = await this.playwrightService.selectConversation(payload);
    const convName = payload.name?.replace(/^conv_\d+_/, '').trim() || '';
    const messages = convName ? this.chatStoreService.getMessages(convName) : [];
    return { success: ok, conversationName: convName, messages };
  }

  @SubscribeMessage('get_chat_history')
  handleGetChatHistory(@MessageBody() payload: { conversationName: string }) {
    const list = this.chatStoreService.getMessages(payload.conversationName);
    return { conversationName: payload.conversationName, messages: list };
  }

  @SubscribeMessage('search_zalo')
  async handleSearchZalo(@MessageBody() payload: { query: string }) {
    const list = await this.playwrightService.searchZalo(payload.query || '');
    return { conversations: list };
  }

  @SubscribeMessage('get_accounts')
  handleGetAccounts() {
    return {
      accounts: this.accountService.getAccounts(),
      activeAccount: this.accountService.getActiveAccount(),
    };
  }

  @SubscribeMessage('switch_account')
  async handleSwitchAccount(@MessageBody() payload: { accountId: string }) {
    this.logger.log(`Yêu cầu đổi sang tài khoản: ${payload.accountId}`);
    const ok = await this.playwrightService.switchAccount(payload.accountId);
    return { success: ok };
  }

  @SubscribeMessage('add_account')
  async handleAddAccount(@MessageBody() payload: { name?: string }) {
    this.logger.log(`Yêu cầu thêm tài khoản: ${payload.name}`);
    const ok = await this.playwrightService.addNewAccount(payload.name);
    return { success: ok };
  }

  @SubscribeMessage('logout_current_account')
  async handleLogout() {
    this.logger.log('Yêu cầu đăng xuất tài khoản hiện tại...');
    const ok = await this.playwrightService.logoutCurrentAccount();
    return { success: ok };
  }

  @SubscribeMessage('refresh_qr')
  async handleRefreshQr() {
    await this.playwrightService.refreshQr();
    return { success: true };
  }

  @SubscribeMessage('get_persona_data')
  handleGetPersona() {
    return {
      profile: this.personaService.getProfile(),
      questions: this.personaService.interviewQuestions,
    };
  }

  @SubscribeMessage('submit_interview')
  async handleSubmitInterview(
    @MessageBody() payload: { answers: { question: string; answer: string }[] },
  ) {
    const newProfile = await this.geminiService.extractPersonaFromInterview(payload.answers);
    return { success: true, profile: newProfile };
  }
}
