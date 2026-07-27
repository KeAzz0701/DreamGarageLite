import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Delete,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { CustomerService } from './customer.service';
import { LicenseService } from '../license/license.service';

@Controller('customer')
export class CustomerController {
  constructor(
    private readonly customerService: CustomerService,
    private readonly licenseService: LicenseService,
  ) {}

  private async assertLineHistoryAllowed() {
    const limits = await this.licenseService.getCurrentPlanLimits();

    if (limits && !limits.lineHistoryView) {
      throw new ForbiddenException(
        'このプランではLINEメッセージ履歴の閲覧・送信はご利用いただけません。',
      );
    }
  }

  @Get()
  async getAll() {
    return this.customerService.getAll();
  }

  /** ':id'ルートより前に置く必要がある(順序が逆だとunread-line-countが:idとして解釈されてしまう) */
  @Get('unread-line-count')
  async getUnreadLineCount() {
    const count = await this.customerService.countUnreadLineMessages();
    return { count };
  }

  @Get(':id')
  async getOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.customerService.getById(id);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    return this.customerService.update(id, body);
  }

  @Delete(':id')
  async delete(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.customerService.delete(id);
  }

  @Get(':id/line-link')
  async getLineLink(
    @Param('id', ParseIntPipe) id: number,
  ) {
    const token = await this.customerService.ensureLineLinkToken(id);
    return { token };
  }

  @Delete(':id/line-link')
  async unlinkLine(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.customerService.unlinkLineUser(id);
  }

  @Get(':id/line-messages')
  async getLineMessages(
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.assertLineHistoryAllowed();
    return this.customerService.getLineMessages(id);
  }

  @Post(':id/line-message')
  async sendLineMessage(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { text: string },
  ) {
    await this.assertLineHistoryAllowed();
    return this.customerService.sendLineMessage(id, body?.text ?? '');
  }

  @Post(':id/line-messages/mark-read')
  async markLineMessagesRead(
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.assertLineHistoryAllowed();
    return this.customerService.markLineMessagesRead(id);
  }
}