import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { AccountSession, PlaywrightStatus } from '../common/types';

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);
  private readonly storageDir = path.resolve('./storage');
  private readonly sessionsDir = path.resolve('./storage/sessions');
  private readonly accountsFile = path.resolve('./storage/accounts.json');

  private accounts: AccountSession[] = [];
  private activeAccountId: string = 'acc_default';

  constructor() {
    this.ensureDirs();
    this.loadAccounts();
  }

  private ensureDirs() {
    if (!fs.existsSync(this.storageDir)) fs.mkdirSync(this.storageDir, { recursive: true });
    if (!fs.existsSync(this.sessionsDir)) fs.mkdirSync(this.sessionsDir, { recursive: true });
  }

  private loadAccounts() {
    try {
      if (fs.existsSync(this.accountsFile)) {
        const raw = fs.readFileSync(this.accountsFile, 'utf-8');
        const data = JSON.parse(raw);
        this.accounts = data.accounts || [];
        this.activeAccountId = data.activeAccountId || this.accounts[0]?.id || 'acc_default';
      } else {
        // Tự động chuyển đổi session.json cũ nếu có
        const oldSession = path.resolve('./storage/session.json');
        const defaultSessionPath = path.resolve(this.sessionsDir, 'acc_default.json');
        
        if (fs.existsSync(oldSession)) {
          fs.copyFileSync(oldSession, defaultSessionPath);
        }

        this.accounts = [
          {
            id: 'acc_default',
            name: 'Tài khoản chính (Zalo 1)',
            avatar: '',
            sessionPath: defaultSessionPath,
            status: 'INITIALIZING',
            lastLogin: Date.now(),
            isActive: true,
          },
        ];
        this.activeAccountId = 'acc_default';
        this.saveAccounts();
      }
    } catch (e) {
      this.logger.error(`Lỗi đọc file accounts.json: ${e.message}`);
    }
  }

  private saveAccounts() {
    try {
      const payload = {
        activeAccountId: this.activeAccountId,
        accounts: this.accounts.map((a) => ({
          ...a,
          isActive: a.id === this.activeAccountId,
        })),
      };
      fs.writeFileSync(this.accountsFile, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (e) {
      this.logger.error(`Lỗi lưu file accounts.json: ${e.message}`);
    }
  }

  getAccounts(): AccountSession[] {
    return this.accounts.map((a) => ({
      ...a,
      isActive: a.id === this.activeAccountId,
    }));
  }

  getActiveAccount(): AccountSession {
    let acc = this.accounts.find((a) => a.id === this.activeAccountId);
    if (!acc) {
      acc = this.accounts[0] || this.addAccount('Tài khoản chính');
      this.activeAccountId = acc.id;
      this.saveAccounts();
    }
    return { ...acc, isActive: true };
  }

  addAccount(name?: string): AccountSession {
    const id = `acc_${Date.now()}`;
    const sessionPath = path.resolve(this.sessionsDir, `${id}.json`);
    const newAcc: AccountSession = {
      id,
      name: name || `Zalo phụ (${this.accounts.length + 1})`,
      avatar: '',
      sessionPath,
      status: 'WAITING_QR',
      lastLogin: Date.now(),
      isActive: true,
    };
    this.accounts.push(newAcc);
    this.activeAccountId = id;
    this.saveAccounts();
    this.logger.log(`Đã tạo tài khoản mới: ${newAcc.name} (${id})`);
    return newAcc;
  }

  switchAccount(id: string): AccountSession | null {
    const target = this.accounts.find((a) => a.id === id);
    if (!target) return null;
    this.activeAccountId = id;
    this.saveAccounts();
    this.logger.log(`Chuyển sang tài khoản: ${target.name} (${id})`);
    return target;
  }

  logoutAccount(id: string): boolean {
    const acc = this.accounts.find((a) => a.id === id);
    if (!acc) return false;

    // Xóa file session
    if (fs.existsSync(acc.sessionPath)) {
      try {
        fs.unlinkSync(acc.sessionPath);
        this.logger.log(`Đã xóa session file: ${acc.sessionPath}`);
      } catch (err) {
        this.logger.warn(`Không thể xóa file session: ${err.message}`);
      }
    }

    acc.status = 'WAITING_QR';
    this.saveAccounts();
    return true;
  }

  updateAccountStatus(id: string, status: PlaywrightStatus) {
    const acc = this.accounts.find((a) => a.id === id);
    if (acc) {
      acc.status = status;
      this.saveAccounts();
    }
  }

  updateAccountInfo(id: string, info: { name?: string; avatar?: string }) {
    const acc = this.accounts.find((a) => a.id === id);
    if (acc) {
      if (info.name) acc.name = info.name;
      if (info.avatar) acc.avatar = info.avatar;
      this.saveAccounts();
    }
  }
}
