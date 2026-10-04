import { Module } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { PersonaService } from './persona.service';
import { AutomationModule } from '../automation/automation.module';

@Module({
  imports: [AutomationModule],
  providers: [PersonaService, GeminiService],
  exports: [PersonaService, GeminiService],
})
export class AiModule {}
