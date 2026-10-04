import { Module } from '@nestjs/common';
import { PlaywrightService } from './playwright.service';
import { AccountService } from './account.service';
import { ChatStoreService } from './chat-store.service';
import { SettingsService } from './settings.service';

@Module({
  providers: [PlaywrightService, AccountService, ChatStoreService, SettingsService],
  exports: [PlaywrightService, AccountService, ChatStoreService, SettingsService],
})
export class AutomationModule {}
