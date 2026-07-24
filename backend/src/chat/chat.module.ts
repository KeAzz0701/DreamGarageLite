// backend/src/chat/chat.module.ts

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GeminiModule } from '../gemini/gemini.module';
import { LicenseModule } from '../license/license.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [PrismaModule, GeminiModule, LicenseModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
