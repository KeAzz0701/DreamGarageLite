// backend/src/marketing-inquiry/marketing-inquiry.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { MasterPrismaService } from '../prisma/master-prisma.service';
import { LineService } from '../line/line.service';
import { SystemAdminLineService } from '../system-admin-line/system-admin-line.service';

@Injectable()
export class MarketingInquiryService {
  private readonly logger = new Logger(MarketingInquiryService.name);

  constructor(
    private readonly masterPrisma: MasterPrismaService,
    private readonly lineService: LineService,
    private readonly systemAdminLineService: SystemAdminLineService,
  ) {}

  /** 宣伝用HPのお問い合わせフォームから届いた内容を保存し、運営者LINEに通知する */
  async create(data: { company: string; name: string; email: string; phone?: string; message: string }) {
    const inquiry = await this.masterPrisma.marketingInquiry.create({ data });

    const adminLineUserIds = await this.systemAdminLineService.listLineUserIds();

    if (adminLineUserIds.length > 0) {
      const text =
        `📩 HPからお問い合わせが届きました\n` +
        `会社: ${data.company}\n` +
        `お名前: ${data.name}\n` +
        `メール: ${data.email}\n` +
        (data.phone ? `電話: ${data.phone}\n` : '') +
        `内容: ${data.message}`;

      for (const adminLineUserId of adminLineUserIds) {
        try {
          // エラー報告通知と同じく、たまたま同じLINE IDが何らかの会社の顧客と一致していても
          // その顧客とのやり取りとしてログに残らないようにする
          await this.lineService.pushMessage(
            adminLineUserId,
            [{ type: 'text', text }],
            undefined,
            false,
            true,
          );
        } catch (err) {
          this.logger.warn(`お問い合わせのLINE通知送信に失敗しました: ${err}`);
        }
      }
    } else {
      this.logger.warn('運営者LINEが未登録のため、LINE通知をスキップしました。');
    }

    return inquiry;
  }
}
