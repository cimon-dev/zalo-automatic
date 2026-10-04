import { Controller, Get } from '@nestjs/common';
import { PlaywrightService } from './automation/playwright.service';

@Controller()
export class AppController {
  constructor(private readonly playwrightService: PlaywrightService) {}

  @Get()
  getStatus() {
    return {
      name: 'Zalo AI Assistant API',
      status: 'online',
      playwrightStatus: this.playwrightService.getStatus(),
      timestamp: new Date().toISOString(),
    };
  }
}
