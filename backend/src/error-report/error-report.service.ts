// backend/src/error-report/error-report.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { MasterPrismaService } from '../prisma/master-prisma.service';
import { LineService } from '../line/line.service';

@Injectable()
export class ErrorReportService {
  private readonly logger = new Logger(ErrorReportService.name);

  constructor(
    private readonly masterPrisma: MasterPrismaService,
    private readonly lineService: LineService,
  ) {}

  async create(data: {
    companyAccountId: number;
    companyName: string;
    pageUrl: string;
    pageLabel?: string;
    userAgent?: string;
    message?: string;
  }) {
    const report = await this.masterPrisma.errorReport.create({ data });

    const adminLineUserId = process.env.SYSTEM_ADMIN_LINE_USER_ID;

    if (adminLineUserId) {
      const text =
        `🚨 エラー報告が届きました\n` +
        `会社: ${data.companyName}\n` +
        `画面: ${data.pageLabel || data.pageUrl}\n` +
        (data.message ? `内容: ${data.message}\n` : '') +
        (data.userAgent ? `環境: ${data.userAgent}` : '');

      try {
        await this.lineService.pushMessage(adminLineUserId, [{ type: 'text', text }]);
      } catch (err) {
        this.logger.warn(`エラー報告のLINE通知送信に失敗しました: ${err}`);
      }
    } else {
      this.logger.warn('SYSTEM_ADMIN_LINE_USER_ID が未設定のため、LINE通知をスキップしました。');
    }

    return report;
  }

  async list() {
    return this.masterPrisma.errorReport.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
