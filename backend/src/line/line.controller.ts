// backend/src/line/line.controller.ts

import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { LineService } from './line.service';

@Controller('line')
export class LineController {
  constructor(private readonly lineService: LineService) {}

  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Req() req: Request & { rawBody: Buffer },
    @Headers('x-line-signature') signature: string,
  ) {
    if (!this.lineService.verifySignature(req.rawBody, signature)) {
      throw new BadRequestException('Invalid signature');
    }

    const events = req.body?.events ?? [];

    // LINEは数秒以内の200応答を要求するため、処理は待たずに返す
    void this.lineService.handleEvents(events);

    return { status: 'ok' };
  }
}
