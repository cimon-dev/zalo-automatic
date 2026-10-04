import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { AutomationModule } from '../automation/automation.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AutomationModule, AiModule],
  providers: [ChatGateway],
  exports: [ChatGateway],
})
export class GatewayModule {}
