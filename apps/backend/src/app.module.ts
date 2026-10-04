import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AutomationModule } from './automation/automation.module';
import { GatewayModule } from './gateway/gateway.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [AutomationModule, GatewayModule, AiModule],
  controllers: [AppController],
})
export class AppModule {}
