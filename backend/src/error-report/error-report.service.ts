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
    screenshotBase64?: string;
    screenshotMimeType?: string;
  }) {
    const { screenshotBase64, ...rest } = data;

    const report = await this.masterPrisma.errorReport.create({
      data: {
        ...rest,
        screenshotData: screenshotBase64 ? Buffer.from(screenshotBase64, 'base64') : undefined,
        screenshotMimeType: screenshotBase64 ? data.screenshotMimeType || 'image/png' : undefined,
      },
    });

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

  /** 未対応分のみ返す(既定)。resolvedを渡すと絞り込みを切り替えられる */
  async list(resolved = false) {
    const reports = await this.masterPrisma.errorReport.findMany({
      where: { resolved },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return reports.map((r) => ({
      ...r,
      screenshotData: undefined,
      screenshotBase64: r.screenshotData
        ? `data:${r.screenshotMimeType || 'image/png'};base64,${Buffer.from(r.screenshotData).toString('base64')}`
        : null,
    }));
  }

  async resolve(id: number, note?: string) {
    return this.masterPrisma.errorReport.update({
      where: { id },
      data: { resolved: true, resolvedNote: note || undefined, resolvedAt: new Date() },
    });
  }

  async reopen(id: number) {
    return this.masterPrisma.errorReport.update({
      where: { id },
      data: { resolved: false, resolvedNote: null, resolvedAt: null },
    });
  }
}
