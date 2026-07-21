// backend/src/notification/notification.controller.ts

import { Controller, Post } from '@nestjs/common';
import { NotificationService } from './notification.service';

@Controller('notification')
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
  ) {}

  @Post('run-now')
  async runNow() {
    return this.notificationService.checkExpirations();
  }
}
