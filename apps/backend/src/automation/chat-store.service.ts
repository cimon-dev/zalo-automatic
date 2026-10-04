import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { IncomingMessage } from '../common/types';

export function sanitizeMessageContent(content: string): string {
  if (!content) return '';
  let cleaned = content;

  // 1. Loại bỏ các mã reaction Zalo như /-strong, /-heart, /-break, /-flag, etc.
  cleaned = cleaned.replace(/\/-[a-zA-Z0-9_-]+/g, '');

  // 2. Loại bỏ các biểu tượng cảm xúc thường dính trong thanh reaction Zalo: :>, :o, :-((, :-h, :-D, :-*, :P, :-(, :-)
  cleaned = cleaned.replace(/(:\>|:o|:-\(\(|:-h|:-D|:-\*|:P|:-\(|:-\)|;-\))/g, '');

  // 3. Loại bỏ thời gian bị dính ở cuối tin nhắn (ví dụ: " 20:57", "21:01", " 09:30 AM")
  cleaned = cleaned.replace(/\s*\b\d{1,2}:\d{2}(\s*(AM|PM|am|pm))?\s*$/g, '');

  // 4. Loại bỏ thời gian bị dính ở đầu tin nhắn
  cleaned = cleaned.replace(/^\s*\b\d{1,2}:\d{2}\s*/g, '');

  // 5. Loại bỏ tiền tố xưng hô nếu có (ví dụ: "Bạn: ", "Tôi: ", "Khách hàng: ")
  cleaned = cleaned.replace(/^(Bạn|Tôi|Khách hàng):\s*/, '');

  // 6. Xóa ký tự rác và khoảng trắng thừa
  cleaned = cleaned.trim();
  return cleaned;
}

@Injectable()
export class ChatStoreService {
  private readonly logger = new Logger(ChatStoreService.name);
  private readonly storageDir = path.resolve('./storage');
  private readonly historyFile = path.resolve('./storage/chat_history.json');

  // Map: normalized conversation name -> danh sách tin nhắn
  private histories: Map<string, IncomingMessage[]> = new Map();
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.ensureDir();
    this.loadHistory();
  }

  private ensureDir() {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  public normalizeKey(name: string): string {
    return (name || '')
      .replace(/[\s\u00a0]+/g, ' ')
      .trim()
      .toLowerCase()
      .replace(/^conv_\d+_/, '');
  }

  private loadHistory() {
    try {
      if (fs.existsSync(this.historyFile)) {
        const raw = fs.readFileSync(this.historyFile, 'utf-8');
        const data = JSON.parse(raw);
        for (const [key, msgs] of Object.entries(data)) {
          if (Array.isArray(msgs)) {
            const normKey = this.normalizeKey(key);
            const sanitized = (msgs as IncomingMessage[])
              .map((m) => ({
                ...m,
                content: sanitizeMessageContent(m.content),
              }))
              .filter((m) => m.content && m.content.length > 0);

            const existing = this.histories.get(normKey) || [];
            const map = new Map<string, IncomingMessage>();
            existing.forEach((m) => map.set(m.id || `${m.content}_${m.isSelf}`, m));
            sanitized.forEach((m) => {
              const k = m.id || `${m.content}_${m.isSelf}`;
              if (!map.has(k)) {
                map.set(k, m);
                existing.push(m);
              }
            });
            this.histories.set(normKey, existing);
          }
        }
        this.logger.log(`Đã tải & chuẩn hóa lịch sử trò chuyện cho ${this.histories.size} hội thoại.`);
      }
    } catch (e) {
      this.logger.error(`Lỗi đọc file chat_history.json: ${e.message}`);
    }
  }

  private scheduleSave() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      try {
        const obj: Record<string, IncomingMessage[]> = {};
        for (const [key, msgs] of this.histories.entries()) {
          // Lưu tối đa 200 tin nhắn gần nhất cho mỗi hội thoại để tối ưu bộ nhớ
          obj[key] = msgs.slice(-200);
        }
        fs.writeFileSync(this.historyFile, JSON.stringify(obj, null, 2), 'utf-8');
      } catch (err) {
        this.logger.error(`Lỗi ghi file chat_history.json: ${err.message}`);
      }
    }, 1000);
  }

  getMessages(conversationName: string): IncomingMessage[] {
    const key = this.normalizeKey(conversationName);
    return this.histories.get(key) || [];
  }

  addMessage(conversationName: string, message: IncomingMessage): void {
    if (!conversationName || !message || !message.content) return;
    const cleanContent = sanitizeMessageContent(message.content);
    if (!cleanContent) return;

    const sanitizedMsg: IncomingMessage = {
      ...message,
      content: cleanContent,
    };

    const key = this.normalizeKey(conversationName);
    const list = this.histories.get(key) || [];

    // Tránh trùng lặp tin nhắn theo content và thời gian gần nhau (trong 5 giây)
    const isDuplicate = list.some(
      (m) =>
        m.id === sanitizedMsg.id ||
        (m.content === sanitizedMsg.content && Math.abs(m.timestamp - sanitizedMsg.timestamp) < 5000)
    );

    if (!isDuplicate) {
      list.push(sanitizedMsg);
      this.histories.set(key, list);
      this.scheduleSave();
    }
  }

  mergeMessages(conversationName: string, newMessages: IncomingMessage[]): IncomingMessage[] {
    if (!conversationName) return [];
    const key = this.normalizeKey(conversationName);
    const existing = this.histories.get(key) || [];

    const existingMap = new Map<string, IncomingMessage>();
    existing.forEach((m) => {
      existingMap.set(m.id || `${m.content}_${m.isSelf}`, m);
    });

    for (const m of newMessages) {
      const cleanContent = sanitizeMessageContent(m.content);
      if (!cleanContent) continue;

      const sanitizedMsg: IncomingMessage = {
        ...m,
        content: cleanContent,
      };

      const idKey = sanitizedMsg.id || `${sanitizedMsg.content}_${sanitizedMsg.isSelf}`;
      if (!existingMap.has(idKey)) {
        existingMap.set(idKey, sanitizedMsg);
        existing.push(sanitizedMsg);
      }
    }

    // Sắp xếp lại theo thời gian
    existing.sort((a, b) => a.timestamp - b.timestamp);
    this.histories.set(key, existing);
    this.scheduleSave();
    return existing;
  }
}
