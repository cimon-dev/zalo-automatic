import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { chromium, Browser, BrowserContext, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import { ZaloSelectors } from './zalo-selectors';
import { AccountService } from './account.service';
import { ChatStoreService } from './chat-store.service';
import { SettingsService } from './settings.service';
import { ConversationItem, IncomingMessage, PlaywrightStatus } from '../common/types';

@Injectable()
export class PlaywrightService extends EventEmitter implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PlaywrightService.name);
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  private status: PlaywrightStatus = 'DISCONNECTED';
  private isHeadless = process.env.HEADLESS === 'true';
  private processedMessageIds = new Set<string>();
  private isInitializing = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private cachedConversations: ConversationItem[] = [];
  private activeConversationName: string = '';
  private lastKnownSubtitles = new Map<string, string>();
  private isSwitchingConversation = false;

  constructor(
    private readonly accountService: AccountService,
    private readonly chatStoreService: ChatStoreService,
    private readonly settingsService: SettingsService,
  ) {
    super();
  }

  async onModuleInit() {
    this.initBrowser().catch((err) => {
      this.logger.error(`Lỗi khởi chạy browser nền: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    await this.cleanup();
  }

  public getStatus(): PlaywrightStatus {
    return this.status;
  }

  public getActiveConversationName(): string {
    return this.activeConversationName;
  }

  /**
   * Khởi chạy trình duyệt
   */
  async initBrowser() {
    if (this.isInitializing) return;
    this.isInitializing = true;

    try {
      this.status = 'INITIALIZING';
      this.emit('status_change', this.status);

      if (this.syncInterval) clearInterval(this.syncInterval);
      if (this.page) await this.page.close().catch(() => {});
      if (this.context) await this.context.close().catch(() => {});

      const activeAccount = this.accountService.getActiveAccount();
      const sessionPath = activeAccount.sessionPath;
      const hasSession = fs.existsSync(sessionPath);

      this.logger.log(`[Account: ${activeAccount.name}] Khởi chạy session...`);

      if (!this.browser) {
        this.browser = await chromium.launch({
          headless: this.isHeadless,
          args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-infobars',
            '--window-size=1280,800',
          ],
        });

        this.browser.on('disconnected', () => {
          this.logger.warn('Browser bị đóng hoặc ngắt kết nối. Tự khởi động lại sau 5s...');
          this.status = 'DISCONNECTED';
          this.emit('status_change', this.status);
          setTimeout(() => this.initBrowser(), 5000);
        });
      }

      this.context = await this.browser.newContext({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 800 },
        storageState: hasSession ? sessionPath : undefined,
      });

      this.page = await this.context.newPage();

      await this.page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      });

      await this.navigateToZalo();
    } catch (error) {
      this.logger.error(`Lỗi khởi tạo Playwright: ${error.message}`, error.stack);
      this.status = 'ERROR';
      this.emit('status_change', this.status);
    } finally {
      this.isInitializing = false;
    }
  }

  private async navigateToZalo() {
    if (!this.page) return;

    this.logger.log('Điều hướng đến https://chat.zalo.me ...');
    try {
      await this.page.goto('https://chat.zalo.me', { waitUntil: 'domcontentloaded', timeout: 45000 });

      // Kiểm tra trạng thái trang mỗi giây trong 60 giây để xử lý trường hợp mạng chậm hoặc màn hình Đang đăng nhập...
      for (let i = 0; i < 60; i++) {
        await this.page.waitForTimeout(1000);

        // 1. Kiểm tra xem đã đăng nhập vào màn hình chat chưa
        const chatEl = await this.page.$('#chat-list-container, #main-tab, .nav__tabs, .conv-list, #contact-search-input');
        if (chatEl) {
          this.logger.log(`Session hợp lệ, đã đăng nhập thành công sau ${i + 1}s!`);
          await this.onLoginSuccess();
          return;
        }

        // 2. Kiểm tra xem có mã QR trên màn hình chưa
        const qrEl = await this.page.$('.qrcode-img, .qr-container, canvas, .login-body img');
        if (qrEl) {
          this.logger.log(`Phát hiện mã QR sau ${i + 1}s, đang xử lý chụp QR...`);
          this.status = 'WAITING_QR';
          this.emit('status_change', this.status);
          await this.captureAndWatchQrCode();
          return;
        }
      }

      this.logger.warn(`Sau 60s chưa thấy màn hình chat, URL: ${this.page.url()} | Title: ${await this.page.title()}`);
      await this.captureAndWatchQrCode();
    } catch (err) {
      this.logger.error(`Lỗi kiểm tra đăng nhập: ${err.message}`);
      await this.captureAndWatchQrCode();
    }
  }

  private async captureAndWatchQrCode() {
    if (!this.page) return;

    try {
      // 1. Kiểm tra lại xem có phải đã đăng nhập thành công không
      const checkChat = await this.page.$('#chat-list-container, #main-tab, .nav__tabs, .conv-list, #contact-search-input');
      if (checkChat) {
        await this.onLoginSuccess();
        return;
      }

      // 2. Click tab "VỚI MÃ QR" nếu Zalo Web đang hiển thị tab Số điện thoại
      await this.page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('a, div, span, li, [class*="tab"]'));
        const qrTab = tabs.find((t) => t.textContent && (t.textContent.includes('MÃ QR') || t.textContent.includes('QR')));
        if (qrTab && typeof (qrTab as HTMLElement).click === 'function') {
          (qrTab as HTMLElement).click();
        }
      }).catch(() => {});
      await this.page.waitForTimeout(600);

      this.logger.log('Đang tìm phần tử mã QR trên trang...');
      const qrElement = await this.page.waitForSelector(
        '.qrcode-img, .qr-container, canvas, .login-body img, [class*="qrcode"]',
        { timeout: 30000 }
      ).catch(() => null);

      if (qrElement) {
        await this.page.waitForTimeout(600);
        const qrBuffer = await qrElement.screenshot();
        const base64Image = `data:image/png;base64,${qrBuffer.toString('base64')}`;

        this.logger.log('Đã tạo ảnh QR Code thành công. Đang gửi về UI...');
        this.emit('qr_code', base64Image);

        await this.page.waitForSelector('#chat-list-container, #main-tab, .nav__tabs, .conv-list, #contact-search-input', { timeout: 180000 });
        await this.onLoginSuccess();
      } else {
        // Kiểm tra lần cuối sau timeout xem có vừa vào chat không
        const checkAfter = await this.page.$('#chat-list-container, #main-tab, .nav__tabs, .conv-list, #contact-search-input');
        if (checkAfter) {
          await this.onLoginSuccess();
        }
      }
    } catch (error) {
      this.logger.error(`Lỗi khi chờ/chụp mã QR: ${error.message}`);
    }
  }

  private async onLoginSuccess() {
    this.status = 'READY';
    const activeAccount = this.accountService.getActiveAccount();
    this.accountService.updateAccountStatus(activeAccount.id, 'READY');
    this.emit('status_change', this.status);

    this.logger.log(`ĐĂNG NHẬP THÀNH CÔNG cho tài khoản: ${activeAccount.name}`);

    if (this.context) {
      try {
        const dir = path.dirname(activeAccount.sessionPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        await this.context.storageState({ path: activeAccount.sessionPath });
        this.logger.log(`Session đã lưu tại: ${activeAccount.sessionPath}`);
      } catch (err) {
        this.logger.warn(`Không thể lưu session: ${err.message}`);
      }
    }

    await this.page?.waitForTimeout(1500);
    await this.setupDOMHooks();
    this.startPeriodicSync();
  }

  /**
   * Cài đặt DOM Hooks và Global MutationObserver
   */
  private async setupDOMHooks() {
    if (!this.page) return;

    this.logger.log('Thiết lập DOM Hooks và MutationObserver cho Zalo Web...');

    try {
      await this.page.exposeFunction('__onZaloMessageReceived', (msg: IncomingMessage) => {
        if (!msg || !msg.content || !msg.conversationName) return;

        // Bỏ qua nếu đang trong quá trình chuyển đổi giữa các cuộc hội thoại
        if (this.isSwitchingConversation) return;

        if (this.processedMessageIds.has(msg.id)) return;
        this.processedMessageIds.add(msg.id);

        if (this.processedMessageIds.size > 2000) {
          const first = this.processedMessageIds.values().next().value;
          if (first) this.processedMessageIds.delete(first);
        }

        const convName = msg.conversationName;
        this.chatStoreService.addMessage(convName, msg);

        this.logger.log(`[Tin nhắn Zalo đến] [${convName}] ${msg.senderName}: "${msg.content}" (isSelf: ${msg.isSelf})`);
        this.emit('incoming_message', msg);
      });
    } catch {
      // Expose function already registered
    }

    await this.page.evaluate(() => {
      const extractMessageData = (row: Element, activeChatTitle: string) => {
        const isSelf =
          row.classList.contains('me') ||
          row.classList.contains('my-msg') ||
          row.classList.contains('chat-message--me') ||
          row.closest('.me, .my-msg, [class*="--me"]') !== null ||
          row.querySelector('.me, .message-wrapper--me') !== null;

        const senderEl = row.querySelector('.message-sender-name-content, .truncate, .sender-name, .msg-sender, .user-name');
        const senderName = isSelf ? 'Tôi' : (senderEl?.textContent?.trim() || activeChatTitle || 'Khách hàng');

        const textEl = row.querySelector(`
          .text-message__container, 
          [data-component="message-text-content"], 
          [data-component="text-container"], 
          .undo-message,
          .quote-banner__content,
          .card--text
        `);

        let content = '';
        if (textEl) {
          const clone = textEl.cloneNode(true) as HTMLElement;
          clone.querySelectorAll('.quote-banner, .quote-msg').forEach((q) => q.remove());
          content = clone.textContent?.trim() || '';
        } else {
          const stickerImg = row.querySelector('img.sticker-img, [class*="sticker"] img');
          const fileEl = row.querySelector('.file-name, [class*="file"]');
          if (stickerImg) {
            content = '[Sticker]';
          } else if (fileEl) {
            content = `[File: ${fileEl.textContent?.trim()}]`;
          } else {
            const cardEl = row.querySelector('.card, .message-frame') || row;
            const clone = cardEl.cloneNode(true) as HTMLElement;
            clone.querySelectorAll('.card-send-time, .message-reaction-container, .reactions-total, .reactions-container, .msg-reaction-icon, [data-id*="Reaction"], .floating-menu-wrapper, .avatar').forEach((n) => n.remove());
            content = clone.textContent?.trim() || '';
          }
        }

        content = content
          .replace(/\/-[a-zA-Z0-9_-]+/g, '')
          .replace(/(:\>|:o|:-\(\(|:-h|:-D|:-\*|:P|:-\(|:-\)|;-\))/g, '')
          .replace(/\s*\b\d{1,2}:\d{2}(\s*(AM|PM|am|pm))?\s*$/g, '')
          .replace(/^\s*\b\d{1,2}:\d{2}\s*/g, '')
          .replace(/^(Bạn|Tôi|Khách hàng):\s*/, '')
          .trim();

        return { isSelf, senderName, content };
      };

      const observer = new MutationObserver((mutations) => {
        if ((window as any).__isSwitchingConversation) return;

        const headerEl = document.querySelector('header#header .main-title-container, header#header .header-title, .main-title-container, .header-title');
        const activeChatTitle = (headerEl?.textContent || '').replace(/[\s\u00a0]+/g, ' ').trim();
        if (!activeChatTitle) return;

        for (const mutation of mutations) {
          if (!mutation.addedNodes || mutation.addedNodes.length === 0) continue;

          for (const node of Array.from(mutation.addedNodes)) {
            if (!(node instanceof HTMLElement)) continue;

            const rows = node.matches('.chat-message, [id^="bb_msg_"]')
              ? [node]
              : Array.from(node.querySelectorAll('.chat-message, [id^="bb_msg_"]'));

            // Nếu nhiều hơn 2 tin nhắn được thêm cùng lúc, đây là việc nạp lịch sử chat, không phải tin nhắn mới đến trong thời gian thực
            if (rows.length > 2) continue;

            for (const row of rows) {
              if (row.closest('#chat-list-container, .conv-list, .nav__tabs, #recent-search-list')) continue;

              const { isSelf, senderName, content } = extractMessageData(row, activeChatTitle);
              if (!content || content.length === 0 || content === 'Đã gửi' || content === 'Đã nhận') continue;

              const id = row.getAttribute('id') || `msg_${Date.now()}_${content.substring(0, 10)}`;

              (window as any).__onZaloMessageReceived({
                id,
                senderName,
                content,
                timestamp: Date.now(),
                isSelf,
                conversationName: activeChatTitle,
              });
            }
          }
        }
      });

      const chatView = document.querySelector('#chatViewContainer, .chat-view-container, #message-view, [id^="chatView"]') || document.body;
      observer.observe(chatView, { childList: true, subtree: true });
      console.log('✅ Global Zalo MutationObserver đã kích hoạt với cơ chế trích xuất addedNodes chuẩn xác!');
    });
  }

  /**
   * Quét và trích xuất danh sách hội thoại từ cột trái Zalo Web (Kèm nhận diện Tắt thông báo)
   */
  async syncConversations(): Promise<ConversationItem[]> {
    if (!this.page || this.status !== 'READY') return [];

    try {
      const conversations: ConversationItem[] = await this.page.evaluate(() => {
        const results: any[] = [];
        const items = document.querySelectorAll(
          '.conv-item, .chat-item, [id^="conv-item-"], div[tabindex="0"].conv-item'
        );

        items.forEach((item, index) => {
          const titleEl = item.querySelector('.conv-item-title, .truncate, .chat-item-title, .name');
          const subEl = item.querySelector('.conv-item-subtitle, .desc, .chat-item-subtitle, .last-msg');
          const avatarEl = item.querySelector('img.avatar-img, .avatar img, img') as HTMLImageElement;
          const timeEl = item.querySelector('.time, .conv-item-time');
          const badgeEl = item.querySelector('.unread-badge, .badge, [class*="unread"]');

          // Nhận diện hội thoại có icon Tắt thông báo (Mute / Bell slash)
          const muteEl = item.querySelector(
            '.fa-bell-slash, [class*="bell-slash"], [class*="mute"], .icon-mute, .icon-bell-mute, svg[data-icon="bell-slash"], [title*="tắt thông báo"], [title*="Tắt thông báo"], [title*="tắt chuông"], [aria-label*="tắt thông báo"]'
          );
          const isMuted = !!muteEl;

          const name = titleEl?.textContent?.replace(/[\s\u00a0]+/g, ' ').trim();
          if (name) {
            const id = item.getAttribute('id') || item.getAttribute('data-id') || `conv_${index}_${name}`;
            const unreadText = badgeEl?.textContent?.trim() || '0';
            const unreadCount = parseInt(unreadText.replace(/\D/g, ''), 10) || (badgeEl ? 1 : 0);
            const isActive = item.classList.contains('active') || item.classList.contains('selected');

            results.push({
              id,
              name,
              avatar: avatarEl?.src || '',
              lastMessage: subEl?.textContent?.trim() || '',
              time: timeEl?.textContent?.trim() || '',
              unreadCount,
              isActive,
              isMuted,
              index,
            });
          }
        });

        return results;
      });

      this.cachedConversations = conversations;
      this.emit('conversations_updated', conversations);
      return conversations;
    } catch (e) {
      return this.cachedConversations;
    }
  }

  /**
   * Chọn một cuộc hội thoại và nạp ngay lịch sử tin nhắn
   */
  async selectConversation(target: { id?: string; name?: string; phone?: string; isGlobalSearch?: boolean; index?: number } | string): Promise<boolean> {
    if (!this.page || this.status !== 'READY') return false;

    let targetName = '';
    let targetId = '';
    let targetPhone = '';
    let targetIndex: number | undefined;

    if (typeof target === 'string') {
      targetName = target;
    } else {
      targetName = target.name || '';
      targetId = target.id || '';
      targetPhone = target.phone || '';
      targetIndex = target.index;
      // Nếu là kết quả tìm kiếm số điện thoại hoặc tìm kiếm toàn cầu, mở qua hàm xử lý chuyên biệt
      if (target.isGlobalSearch || targetId.startsWith('phone_') || targetId.startsWith('search_') || targetPhone) {
        return this.openPhoneOrSearchResult(target);
      }
    }

    const cleanName = targetName.replace(/^conv_\d+_/, '').trim();
    this.activeConversationName = cleanName;
    this.logger.log(`Đang mở cuộc trò chuyện: "${cleanName}" (Index: ${targetIndex})`);

    // 1. Gửi NGAY LẬP TỨC lịch sử tin nhắn đã lưu trong database sang UI
    const cachedHistory = this.chatStoreService.getMessages(cleanName);
    this.emit('chat_history', { conversationName: cleanName, messages: cachedHistory });

    this.isSwitchingConversation = true;
    await this.page.evaluate(() => { (window as any).__isSwitchingConversation = true; }).catch(() => {});

    try {
      // 2. Đóng thanh popup tìm kiếm triệt để
      await this.page.evaluate(() => {
        const searchInput = document.querySelector('#contact-search-input') as HTMLInputElement;
        if (searchInput) {
          searchInput.value = '';
          searchInput.blur();
        }
      }).catch(() => {});
      await this.page.keyboard.press('Escape').catch(() => {});
      await this.page.keyboard.press('Escape').catch(() => {});
      await this.page.waitForTimeout(100);

      // 3. Tìm và click trực tiếp bằng JavaScript trong DOM để chuẩn hóa khoảng trắng và non-breaking spaces
      const clicked = await this.page.evaluate(({ cleanName, targetIndex }) => {
        const normalize = (s: string) => (s || '').replace(/[\s\u00a0]+/g, ' ').trim().toLowerCase();
        const needle = normalize(cleanName);

        const items = Array.from(document.querySelectorAll(
          '.conv-item, .chat-item, [id^="conv-item-"], div[tabindex="0"].conv-item'
        ));

        let targetEl: HTMLElement | null = null;

        // Ưu tiên tìm khớp tên chính xác
        for (const item of items) {
          const title = item.querySelector('.conv-item-title, .truncate, .chat-item-title, .name');
          if (title && normalize(title.textContent || '') === needle) {
            targetEl = item as HTMLElement;
            break;
          }
        }

        // Nếu không khớp tuyệt đối, tìm khớp một phần
        if (!targetEl) {
          for (const item of items) {
            const title = item.querySelector('.conv-item-title, .truncate, .chat-item-title, .name');
            if (title && normalize(title.textContent || '').includes(needle)) {
              targetEl = item as HTMLElement;
              break;
            }
          }
        }

        // Fallback theo index nếu có
        if (!targetEl && typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex < items.length) {
          targetEl = items[targetIndex] as HTMLElement;
        }

        if (targetEl) {
          targetEl.scrollIntoView({ block: 'center' });
          const clickChild = (targetEl.querySelector('.conv-item-title, .truncate, .chat-item-title, .name') || targetEl) as HTMLElement;
          ['mousedown', 'mouseup', 'click'].forEach(evt => {
            clickChild.dispatchEvent(new MouseEvent(evt, { bubbles: true, cancelable: true }));
            targetEl.dispatchEvent(new MouseEvent(evt, { bubbles: true, cancelable: true }));
          });
          clickChild.click();
          targetEl.click();
          return true;
        }

        return false;
      }, { cleanName, targetIndex });

      if (clicked) {
        // Chờ header cập nhật sang cuộc hội thoại mong muốn (tối đa 2.5s)
        await this.page.waitForFunction((expectedName) => {
          const normalize = (s: string) => (s || '').replace(/[\s\u00a0]+/g, ' ').trim().toLowerCase();
          const needle = normalize(expectedName);
          const headerEl = document.querySelector('header#header .main-title-container, header#header .header-title, .main-title-container, .header-title');
          const title = normalize(headerEl?.textContent || '');
          return title.length > 0 && (title.includes(needle) || needle.includes(title));
        }, cleanName, { timeout: 2500 }).catch(() => {});

        await this.page.waitForTimeout(300);

        // Kiểm tra xem header thực tế trên Zalo Web đã chuyển sang hội thoại này chưa
        const actualHeader = await this.page.evaluate(() => {
          const headerEl = document.querySelector('header#header .main-title-container, header#header .header-title, .main-title-container, .header-title');
          return (headerEl?.textContent || '').replace(/[\s\u00a0]+/g, ' ').trim();
        });

        const normalize = (s: string) => (s || '').replace(/[\s\u00a0]+/g, ' ').trim().toLowerCase();
        const normActual = normalize(actualHeader);
        const normExpected = normalize(cleanName);

        if (normActual && (normActual.includes(normExpected) || normExpected.includes(normActual))) {
          this.activeConversationName = actualHeader;
          await this.syncCurrentChatMessages(actualHeader);
          await this.syncConversations();
          return true;
        } else {
          this.logger.warn(`Header Zalo hiện tại là "${actualHeader}", không khớp "${cleanName}". Bỏ qua nạp từ DOM để bảo vệ dữ liệu.`);
          return true;
        }
      }

      return false;
    } catch (error) {
      this.logger.error(`Lỗi mở cuộc trò chuyện: ${error.message}`);
      return false;
    } finally {
      this.isSwitchingConversation = false;
      await this.page.evaluate(() => { (window as any).__isSwitchingConversation = false; }).catch(() => {});
    }
  }

  /**
   * Đọc và trích xuất toàn bộ tin nhắn trong khung chat đang mở, hợp nhất vào Database
   */
  async syncCurrentChatMessages(convName?: string): Promise<IncomingMessage[]> {
    if (!this.page || this.status !== 'READY') return [];
    let targetConv = convName || this.activeConversationName;

    try {
      const currentHeader = await this.page.evaluate(() => {
        const headerEl = document.querySelector('header#header .main-title-container, header#header .header-title, .main-title-container, .header-title');
        return (headerEl?.textContent || '').replace(/[\s\u00a0]+/g, ' ').trim();
      });

      targetConv = convName || currentHeader || this.activeConversationName;
      if (!targetConv) return [];

      const normalize = (s: string) => (s || '').replace(/[\s\u00a0]+/g, ' ').trim().toLowerCase();
      const normTarget = normalize(targetConv);
      const normHeader = normalize(currentHeader);

      // KIỂM TRA BẢO VỆ CHỐNG NHẢY TIN NHẮN: Nếu có tên chỉ định mà Header thực tế trên Zalo không khớp -> BỎ QUA NGAY!
      if (convName && normHeader && normTarget && !normHeader.includes(normTarget) && !normTarget.includes(normHeader)) {
        this.logger.warn(`[syncCurrentChatMessages] BẢO VỆ DỮ LIỆU: Header trên Zalo là "${currentHeader}", không khớp yêu cầu "${targetConv}". Bỏ qua nạp từ DOM.`);
        const cached = this.chatStoreService.getMessages(targetConv);
        this.emit('chat_history', { conversationName: targetConv, messages: cached });
        return cached;
      }

      const actualConvToSave = currentHeader || targetConv;

      const messages: IncomingMessage[] = await this.page.evaluate((contactName) => {
        const results: IncomingMessage[] = [];
        const container = document.querySelector('#chatViewContainer, .chat-view-container, #message-view, [id^="chatView"]') || document.body;

        const candidateRows = Array.from(container.querySelectorAll('.chat-message, [id^="bb_msg_"]'));

        candidateRows.forEach((row, i) => {
          if (row.closest('#chat-list-container, .conv-list, .nav__tabs, #recent-search-list')) return;

          const isSelf =
            row.classList.contains('me') ||
            row.classList.contains('my-msg') ||
            row.classList.contains('chat-message--me') ||
            row.closest('.me, .my-msg, [class*="--me"]') !== null ||
            row.querySelector('.me, .message-wrapper--me') !== null;

          const senderEl = row.querySelector('.message-sender-name-content, .truncate, .sender-name, .msg-sender, .user-name');
          const senderName = isSelf ? 'Tôi' : (senderEl?.textContent?.trim() || contactName || 'Khách hàng');

          const textEl = row.querySelector(`
            .text-message__container, 
            [data-component="message-text-content"], 
            [data-component="text-container"], 
            .undo-message,
            .quote-banner__content,
            .card--text
          `);

          let content = '';
          if (textEl) {
            const clone = textEl.cloneNode(true) as HTMLElement;
            clone.querySelectorAll('.quote-banner, .quote-msg').forEach((q) => q.remove());
            content = clone.textContent?.trim() || '';
          } else {
            const stickerImg = row.querySelector('img.sticker-img, [class*="sticker"] img');
            const fileEl = row.querySelector('.file-name, [class*="file"]');
            if (stickerImg) {
              content = '[Sticker]';
            } else if (fileEl) {
              content = `[File: ${fileEl.textContent?.trim()}]`;
            } else {
              const cardEl = row.querySelector('.card, .message-frame') || row;
              const clone = cardEl.cloneNode(true) as HTMLElement;
              clone.querySelectorAll('.card-send-time, .message-reaction-container, .reactions-total, .reactions-container, .msg-reaction-icon, [data-id*="Reaction"], .floating-menu-wrapper, .avatar').forEach((n) => n.remove());
              content = clone.textContent?.trim() || '';
            }
          }

          content = content
            .replace(/\/-[a-zA-Z0-9_-]+/g, '')
            .replace(/(:\>|:o|:-\(\(|:-h|:-D|:-\*|:P|:-\(|:-\)|;-\))/g, '')
            .replace(/\s*\b\d{1,2}:\d{2}(\s*(AM|PM|am|pm))?\s*$/g, '')
            .replace(/^\s*\b\d{1,2}:\d{2}\s*/g, '')
            .replace(/^(Bạn|Tôi|Khách hàng):\s*/, '')
            .trim();

          if (!content || content.length === 0 || content === 'Đã gửi' || content === 'Đã nhận') return;

          const id = row.getAttribute('id') || `msg_${i}_${content.substring(0, 12)}`;

          results.push({
            id,
            senderName,
            content,
            timestamp: Date.now() - (candidateRows.length - i) * 60000,
            isSelf,
            conversationName: contactName,
          });
        });

        return results;
      }, actualConvToSave);

      // Đánh dấu tất cả ID tin nhắn này vào processedMessageIds để MutationObserver không emit lại
      for (const m of messages) {
        if (m.id) this.processedMessageIds.add(m.id);
      }

      if (messages.length > 0 && actualConvToSave) {
        const updated = this.chatStoreService.setMessages(actualConvToSave, messages);
        this.emit('chat_history', { conversationName: actualConvToSave, messages: updated });
        return updated;
      }

      const existing = this.chatStoreService.getMessages(actualConvToSave);
      this.emit('chat_history', { conversationName: actualConvToSave, messages: existing });
      return existing;
    } catch (e) {
      this.logger.error(`Lỗi khi syncCurrentChatMessages: ${e.message}`);
      const fallback = targetConv ? this.chatStoreService.getMessages(targetConv) : [];
      this.emit('chat_history', { conversationName: targetConv, messages: fallback });
      return fallback;
    }
  }

  /**
   * Tìm kiếm Zalo toàn diện theo thời gian thực: Hỗ trợ tìm theo Tên, Số điện thoại và Danh bạ toàn cầu
   */
  async searchZalo(query: string): Promise<ConversationItem[]> {
    if (!this.page || this.status !== 'READY') return [];

    const q = (query || '').trim();

    if (!q) {
      await this.page.keyboard.press('Escape').catch(() => {});
      return this.cachedConversations;
    }

    try {
      this.logger.log(`Tìm kiếm Zalo với từ khóa/số điện thoại: "${q}"`);
      const searchSelector = ZaloSelectors.SEARCH_INPUT;
      const searchInput = await this.page.waitForSelector(searchSelector, { timeout: 3000 });

      if (searchInput) {
        await searchInput.click();
        await searchInput.fill('');
        await searchInput.type(q, { delay: 30 });
        await this.page.waitForTimeout(700);

        const results: ConversationItem[] = await this.page.evaluate((keyword) => {
          const items: ConversationItem[] = [];

          const searchPopupItems = document.querySelectorAll(
            '#recent-search-list .search-item, #recent-search-list .contact-item, #recent-search-list div[tabindex], .search-results .search-item, .search-list .search-item'
          );

          searchPopupItems.forEach((el, idx) => {
            const titleEl = el.querySelector('.search-item-title, .title, .name, .truncate, div > span');
            const subEl = el.querySelector('.search-item-desc, .desc, .phone, .sub-title');
            const avatarEl = el.querySelector('img') as HTMLImageElement;

            const name = titleEl?.textContent?.trim();
            if (name) {
              const sub = subEl?.textContent?.trim() || '';
              const isPhoneGlobal =
                name.toLowerCase().includes('tìm kiếm') ||
                sub.toLowerCase().includes('tìm kiếm') ||
                /\d{9,11}/.test(name) ||
                /\d{9,11}/.test(sub);

              items.push({
                id: `search_${idx}_${name}`,
                name: name,
                avatar: avatarEl?.src || '',
                lastMessage: sub || `Tìm kiếm: ${keyword}`,
                time: isPhoneGlobal ? 'Số điện thoại' : 'Tìm kiếm',
                unreadCount: 0,
                isGlobalSearch: isPhoneGlobal,
                phone: isPhoneGlobal ? keyword : undefined,
                index: idx,
              });
            }
          });

          return items;
        }, q);

        const cleanDigits = q.replace(/[\s.-]/g, '');
        const isPhone = /^\+?\d{9,12}$/.test(cleanDigits);

        if (isPhone) {
          results.unshift({
            id: `phone_global_${cleanDigits}`,
            name: `Tìm SĐT "${cleanDigits}" trên Zalo`,
            lastMessage: 'Nhấn để tìm kiếm và bắt đầu trò chuyện trực tiếp',
            time: 'Số điện thoại',
            unreadCount: 0,
            isGlobalSearch: true,
            phone: cleanDigits,
          });
        }

        if (results.length > 0) {
          this.logger.log(`Tìm thấy ${results.length} kết quả từ popup search Zalo.`);
          return results;
        }
      }
    } catch (e) {
      this.logger.warn(`Lỗi khi tìm kiếm trên DOM Zalo: ${e.message}`);
    }

    const filteredCached = this.cachedConversations.filter(
      (c) =>
        c.name.toLowerCase().includes(q.toLowerCase()) ||
        (c.lastMessage && c.lastMessage.toLowerCase().includes(q.toLowerCase()))
    );

    const cleanDigits = q.replace(/[\s.-]/g, '');
    if (/^\+?\d{9,12}$/.test(cleanDigits)) {
      filteredCached.unshift({
        id: `phone_global_${cleanDigits}`,
        name: `Tìm SĐT "${cleanDigits}" trên Zalo`,
        lastMessage: 'Nhấn để tìm kiếm và bắt đầu trò chuyện trực tiếp',
        time: 'Số điện thoại',
        unreadCount: 0,
        isGlobalSearch: true,
        phone: cleanDigits,
      });
    }

    return filteredCached;
  }

  /**
   * Mở cuộc trò chuyện từ kết quả tìm kiếm số điện thoại toàn cầu
   */
  async openPhoneOrSearchResult(target: { id?: string; name?: string; phone?: string; index?: number }): Promise<boolean> {
    if (!this.page || this.status !== 'READY') return false;

    const phone = target.phone || (target.name ? target.name.replace(/\D/g, '') : '');
    this.logger.log(`Mở cuộc trò chuyện từ SĐT/Tìm kiếm: "${target.name}" (SĐT: ${phone})`);

    try {
      const searchSelector = ZaloSelectors.SEARCH_INPUT;
      const searchInput = await this.page.waitForSelector(searchSelector, { timeout: 3000 });
      if (!searchInput) return false;

      // 1. Nhập từ khóa/SĐT vào ô tìm kiếm
      await searchInput.click();
      await searchInput.fill('');
      await searchInput.type(phone || target.name || '', { delay: 35 });
      await this.page.waitForTimeout(900);

      // 2. Click phần tử kết quả tìm kiếm
      const clicked = await this.page.evaluate((searchTerm) => {
        const popupItems = Array.from(document.querySelectorAll(
          '#recent-search-list .search-item, #recent-search-list .contact-item, #recent-search-list div[tabindex], .search-results .search-item, div[data-id*="search-phone"]'
        ));

        if (popupItems.length === 0) return false;

        let targetEl: HTMLElement | null = null;
        for (const el of popupItems) {
          if (el.textContent && el.textContent.includes(searchTerm)) {
            targetEl = el as HTMLElement;
            break;
          }
        }
        if (!targetEl && popupItems.length > 0) {
          targetEl = popupItems[0] as HTMLElement;
        }

        if (targetEl) {
          targetEl.scrollIntoView({ block: 'center' });
          targetEl.click();
          return true;
        }
        return false;
      }, phone || target.name || '');

      if (!clicked) {
        await this.page.keyboard.press('Enter');
      }

      await this.page.waitForTimeout(1000);

      // 3. Kiểm tra xem có popup Thông tin người dùng (Profile Modal) xuất hiện không
      const profileChatBtn = await this.page.$(
        'button:has-text("Nhắn tin"), [data-translate-inner="STR_CHAT"], .btn-chat, .v2-profile-chat-btn, div[role="button"]:has-text("Nhắn tin")'
      ).catch(() => null);

      if (profileChatBtn) {
        this.logger.log('Phát hiện popup hồ sơ cá nhân. Đang click nút "Nhắn tin"...');
        await profileChatBtn.click();
        await this.page.waitForTimeout(800);
      }

      // 4. Đóng thanh tìm kiếm
      await this.page.keyboard.press('Escape').catch(() => {});
      await this.page.waitForTimeout(300);

      // 5. Lấy tên cuộc trò chuyện vừa mở từ Header
      const newChatName = await this.page.evaluate(() => {
        const headerEl = document.querySelector('header#header .main-title-container, header#header .header-title, .main-title-container, .header-title, .chat-info-name');
        return (headerEl?.textContent || '').replace(/[\s\u00a0]+/g, ' ').trim();
      });

      const activeName = newChatName || target.name || phone;
      this.activeConversationName = activeName;
      this.logger.log(`✅ Đã mở cuộc trò chuyện thành công với: "${activeName}"`);

      await this.syncCurrentChatMessages(activeName);
      await this.syncConversations();
      return true;
    } catch (err) {
      this.logger.error(`Lỗi khi mở SĐT/kết quả tìm kiếm: ${err.message}`);
      return false;
    }
  }

  /**
   * Gửi tin nhắn qua Zalo và tự động lưu vào Chat Store
   */
  async sendMessage(text: string, senderName = 'Tôi (Thủ công)'): Promise<boolean> {
    if (!this.page || this.status !== 'READY') {
      this.logger.warn('Không thể gửi tin: Playwright chưa sẵn sàng!');
      return false;
    }

    try {
      const inputSelector = ZaloSelectors.CHAT_INPUT;

      // Đóng search nếu vô tình còn mở
      await this.page.keyboard.press('Escape').catch(() => {});
      await this.page.waitForTimeout(100);

      // Kiểm tra xem ô input có hiển thị không
      const isInputVisible = await this.page.isVisible(inputSelector).catch(() => false);
      if (!isInputVisible) {
        this.logger.log('Khung chat chưa mở, kích hoạt cuộc trò chuyện đang chọn...');
        const activeItem = this.page.locator('.conv-item.active, .chat-item.active, div[tabindex="0"].active').first();
        if (await activeItem.count() > 0) {
          await activeItem.click().catch(() => {});
          await this.page.waitForTimeout(500);
        }
      }

      await this.page.waitForSelector(inputSelector, { timeout: 6000 });
      await this.page.click(inputSelector);
      await this.page.waitForTimeout(150);

      const settings = this.settingsService.getSettings();
      const minDelay = settings.minKeystrokeDelay || 25;
      const maxDelay = settings.maxKeystrokeDelay || 75;

      // Gõ phím giả lập người thật với delay tự nhiên từ Cài đặt
      for (const char of text) {
        const jitter = Math.floor(Math.random() * (maxDelay - minDelay)) + minDelay;
        await this.page.keyboard.type(char, { delay: jitter });
      }

      await this.page.waitForTimeout(200);
      await this.page.keyboard.press('Enter');

      this.logger.log(`Đã gửi tin nhắn: "${text}"`);

      // Lưu tin nhắn gửi đi vào database lịch sử chat và phát broadcast
      const activeConv = this.activeConversationName || 'Cuộc trò chuyện';
      const sentMsg: IncomingMessage = {
        id: `msg_sent_${Date.now()}`,
        senderName,
        content: text,
        timestamp: Date.now(),
        isSelf: true,
        conversationName: activeConv,
      };
      this.chatStoreService.addMessage(activeConv, sentMsg);
      this.emit('incoming_message', sentMsg);

      await this.page.waitForTimeout(500);
      await this.syncCurrentChatMessages(activeConv);
      return true;
    } catch (error) {
      this.logger.error(`Lỗi khi gửi tin qua DOM: ${error.message}`);
      return false;
    }
  }

  /**
   * Đồng bộ định kỳ 2 giây/lần
   */
  private startPeriodicSync() {
    if (this.syncInterval) clearInterval(this.syncInterval);
    this.syncInterval = setInterval(async () => {
      if (this.status === 'READY') {
        await this.syncConversations();
        if (this.activeConversationName) {
          await this.syncCurrentChatMessages(this.activeConversationName);
        }
      }
    }, 2000);
  }

  async switchAccount(accountId: string): Promise<boolean> {
    const acc = this.accountService.switchAccount(accountId);
    if (!acc) return false;
    this.activeConversationName = '';
    await this.initBrowser();
    return true;
  }

  async addNewAccount(name?: string): Promise<boolean> {
    const newAcc = this.accountService.addAccount(name);
    this.activeConversationName = '';
    await this.initBrowser();
    return true;
  }

  async logoutCurrentAccount(): Promise<boolean> {
    const active = this.accountService.getActiveAccount();
    this.accountService.logoutAccount(active.id);
    this.activeConversationName = '';
    this.status = 'WAITING_QR';
    await this.initBrowser();
    return true;
  }

  async refreshQr(): Promise<void> {
    if (this.page) {
      await this.page.reload({ waitUntil: 'domcontentloaded' });
      await this.captureAndWatchQrCode();
    }
  }

  private async cleanup() {
    if (this.syncInterval) clearInterval(this.syncInterval);
    try {
      if (this.page) await this.page.close().catch(() => {});
      if (this.context) await this.context.close().catch(() => {});
      if (this.browser) await this.browser.close().catch(() => {});
    } catch (e) {
      this.logger.error(`Lỗi cleanup: ${e.message}`);
    }
    this.status = 'DISCONNECTED';
  }
}
