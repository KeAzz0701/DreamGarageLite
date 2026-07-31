// backend/src/error-report/error-report.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { MasterPrismaService } from '../prisma/master-prisma.service';
import { LineService } from '../line/line.service';
import { SystemAdminLineService } from '../system-admin-line/system-admin-line.service';

@Injectable()
export class ErrorReportService {
  private readonly logger = new Logger(ErrorReportService.name);

  constructor(
    private readonly masterPrisma: MasterPrismaService,
    private readonly lineService: LineService,
    private readonly systemAdminLineService: SystemAdminLineService,
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

    const adminLineUserIds = await this.systemAdminLineService.listLineUserIds();

    if (adminLineUserIds.length > 0) {
      const text =
        `🚨 エラー報告が届きました\n` +
        `会社: ${data.companyName}\n` +
        `画面: ${data.pageLabel || data.pageUrl}\n` +
        (data.message ? `内容: ${data.message}\n` : '') +
        (data.userAgent ? `環境: ${data.userAgent}` : '');

      for (const adminLineUserId of adminLineUserIds) {
        try {
          // 運営者向けのシステム通知であり、たまたま同じLINE IDが何らかの会社の顧客と
          // 一致していてもその顧客とのやり取りとしてログに残らないようにする
          await this.lineService.pushMessage(
            adminLineUserId,
            [{ type: 'text', text }],
            undefined,
            false,
            true,
          );
        } catch (err) {
          this.logger.warn(`エラー報告のLINE通知送信に失敗しました: ${err}`);
        }
      }
    } else {
      this.logger.warn('運営者LINEが未登録のため、LINE通知をスキップしました。');
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

  /** 自動診断エージェント(スケジュール実行)が調査結果を登録する。コード変更は行わず、原因と修正方針のテキストのみ */
  async setDiagnosis(id: number, diagnosisNote: string, diagnosisSuggestedFix: string) {
    return this.masterPrisma.errorReport.update({
      where: { id },
      data: {
        diagnosisNote,
        diagnosisSuggestedFix,
        diagnosedAt: new Date(),
      },
    });
  }

  /** 運営者が診断結果を見て採用(APPROVED)/却下(REJECTED)を記録する。verdict=nullで未判定に戻す */
  async setDiagnosisVerdict(id: number, verdict: 'APPROVED' | 'REJECTED' | null) {
    return this.masterPrisma.errorReport.update({
      where: { id },
      data: {
        diagnosisVerdict: verdict,
        diagnosisVerdictAt: verdict ? new Date() : null,
      },
    });
  }
}
