// backend/src/settings/settings.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** 見積書・請求書・納品書の下部に表示する、一般的な整備見積で使われる注意書きの初期文言 */
export const DEFAULT_ESTIMATE_TERMS = [
  '・本お見積りの有効期限は発行日より30日間です。',
  '・分解整備・点検の結果、記載以外の追加整備が必要になる場合がございます。その際は事前にご連絡のうえ、ご了承をいただいてから作業を行います。',
  '・部品の入荷状況により、金額および納期が変動する場合がございます。',
  '・表示金額は消費税抜きの価格です(法定費用・手数料を除く)。別途消費税を申し受けます。',
  '・納車後、本見積りに含まれない箇所の不具合が発見された場合は、別途お見積りのうえご相談させていただきます。',
].join('\n');

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async get(companyId: number) {
    return this.prisma.settings.findUnique({
      where: {
        companyId,
      },
    });
  }

  async create(companyId: number) {
    return this.prisma.settings.create({
      data: {
        companyId,

        theme: 'light',
        estimateTerms: DEFAULT_ESTIMATE_TERMS,
      },
    });
  }

  async update(companyId: number, data: any) {
    return this.prisma.settings.upsert({
      where: {
        companyId,
      },
      update: {
        ...data,
      },
      create: {
        companyId,
        ...data,
      },
    });
  }

  async initialize(companyId: number) {
    const settings = await this.prisma.settings.findUnique({
      where: {
        companyId,
      },
    });

    if (settings) {
      return settings;
    }

    return this.create(companyId);
  }
}