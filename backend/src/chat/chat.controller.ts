// backend/src/chat/chat.controller.ts

import { Body, Controller, Get, Post } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('messages')
  async listMessages() {
    return this.chatService.listMessages();
  }

  @Post('messages')
  async sendMessage(@Body() body: { message: string }) {
    return this.chatService.sendMessage(body?.message ?? '');
  }
}
