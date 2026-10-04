import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { AppSettings } from '../common/types';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  private readonly storageDir = path.resolve('./storage');
  private readonly settingsFile = path.resolve('./storage/settings.json');

  private settings: AppSettings = {
    isGlobalAutoReply: false,
    ignoreMutedChats: true,
    minKeystrokeDelay: 35,
    maxKeystrokeDelay: 75,
    replyDelaySeconds: 2,
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    geminiModel: 'gemini-3.8-flash',
    systemPromptOverride: '',
    blacklist: [],
  };

  constructor() {
    this.ensureDir();
    this.loadSettings();
  }

  private ensureDir() {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  private loadSettings() {
    try {
      if (fs.existsSync(this.settingsFile)) {
        const raw = fs.readFileSync(this.settingsFile, 'utf-8');
        const parsed = JSON.parse(raw);
        this.settings = { ...this.settings, ...parsed };
        this.logger.log('Đã tải cài đặt ứng dụng từ storage/settings.json');
      } else {
        this.saveSettings();
      }
    } catch (e) {
      this.logger.error(`Lỗi đọc storage/settings.json: ${e.message}`);
    }
  }

  public saveSettings() {
    try {
      fs.writeFileSync(this.settingsFile, JSON.stringify(this.settings, null, 2), 'utf-8');
    } catch (e) {
      this.logger.error(`Lỗi lưu storage/settings.json: ${e.message}`);
    }
  }

  public getSettings(): AppSettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<AppSettings>): AppSettings {
    this.settings = { ...this.settings, ...partial };
    this.saveSettings();
    this.logger.log(`Đã cập nhật cài đặt ứng dụng: isGlobalAutoReply=${this.settings.isGlobalAutoReply}, geminiModel=${this.settings.geminiModel}`);
    return this.getSettings();
  }

  public isBlacklisted(name: string, phone?: string): boolean {
    if (!this.settings.blacklist || this.settings.blacklist.length === 0) return false;
    const lowerName = (name || '').toLowerCase();
    const cleanPhone = (phone || '').replace(/\D/g, '');

    return this.settings.blacklist.some((item) => {
      const lowerItem = item.toLowerCase();
      const itemDigits = item.replace(/\D/g, '');
      if (lowerName.includes(lowerItem)) return true;
      if (cleanPhone && itemDigits && cleanPhone.includes(itemDigits)) return true;
      return false;
    });
  }
}
