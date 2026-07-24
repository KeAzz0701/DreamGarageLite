// backend/src/line/line.service.ts

import {
  Inject,
  Injectable,
  Logger,
  forwardRef,
} from '@nestjs/common';
import { validateSignature, messagingApi, webhook } from '@line/bot-sdk';
import type { CompanyAccount } from '.prisma/master-client';
import { CustomerService } from '../customer/customer.service';
import { ReservationService } from '../reservation/reservation.service';
import { parseFlexibleDate, daysUntil } from '../common/japanese-date';
import { TenantContextService } from '../tenant/tenant-context.service';
import { PrismaService } from '../prisma/prisma.service';
import { MasterPrismaService } from '../prisma/master-prisma.service';
import { GeminiService } from '../gemini/gemini.service';
import { OpenRouterService } from '../openrouter/openrouter.service';

// 全社共有のLINE公式アカウントは、実際に稼働しているDream Garage社のチャンネルをそのまま使う
const SHARED_LINE_CHANNEL_COMPANY_CODE = 'ZK5NBWM4';

// GK-<会社コード>-<ランダム6文字>。会社コードを直接埋め込むことで、
// 全社DB総当たりせずにトークンからどの会社宛てか判別できる
const LINK_TOKEN_PATTERN = /^GK-([A-Z0-9]{3,20})-([A-Z0-9]{6})$/;
// GKSTAFF-<会社の社員用参加コード>。会社に1つの固定コードを社員間で使い回す
const STAFF_JOIN_PATTERN = /^GKSTAFF-([A-Z0-9]{6,20})$/;
const STAFF_JOIN_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SERVICE_HISTORY_KEYWORD = '整備履歴';
const RESERVATION_KEYWORD = '予約';
const RESERVATION_ACTION_PICK_COMPANY = 'reserve_pick_company';
const RESERVATION_ACTION_PICK_CATEGORY = 'reserve_pick_category';
const RESERVATION_ACTION_PICK_DATE = 'reserve_pick_date';
const RESERVATION_ACTION_PICK_SLOT = 'reserve_pick_slot';
const RESERVATION_ACTION_SET_LOANER = 'reserve_set_loaner';
const RESERVATION_CATEGORIES = [
  'オイル交換',
  'タイヤ交換',
  '点検',
  '車検',
  '一般整備',
  '故障・トラブル',
  'その他',
];
const MAX_QUICK_REPLY_ITEMS = 13;
const SHAKEN_REMINDER_WINDOW_DAYS = 60;

const mainMenuQuickReply: messagingApi.QuickReply = {
  items: [
    {
      type: 'action',
      action: {
        type: 'message',
        label: '🔧 整備履歴を見る',
        text: SERVICE_HISTORY_KEYWORD,
      },
    },
    {
      type: 'action',
      action: {
        type: 'message',
        label: '📅 ご予約',
        text: RESERVATION_KEYWORD,
      },
    },
  ],
};

type LinkWithCompany = {
  lineUserId: string;
  companyAccountId: number;
  tenantCustomerId: number;
  companyAccount: CompanyAccount;
};

type StaffLinkWithCompany = {
  lineUserId: string;
  companyAccountId: number;
  companyAccount: CompanyAccount;
};

export type ShakenReminderCandidate = {
  vehicleId: number;
  customerName: string;
  vehicleLabel: string;
  registrationNumber: string | null;
  phone: string | null;
  address: string | null;
  expirationDate: string;
};

@Injectable()
export class LineService {
  private readonly logger = new Logger(LineService.name);

  constructor(
    @Inject(forwardRef(() => CustomerService))
    private readonly customerService: CustomerService,
    @Inject(forwardRef(() => ReservationService))
    private readonly reservationService: ReservationService,
    private readonly tenantContext: TenantContextService,
    private readonly prisma: PrismaService,
    private readonly masterPrisma: MasterPrismaService,
    private readonly geminiService: GeminiService,
    private readonly openRouterService: OpenRouterService,
  ) {}

  /** 指定した会社をテナントコンテキストとして確立した状態でfnを実行する */
  private withCompany<T>(company: CompanyAccount, fn: () => Promise<T>): Promise<T> {
    return Promise.resolve(this.tenantContext.run(company, fn));
  }

  private async getSharedChannelCompany(): Promise<CompanyAccount | null> {
    return this.masterPrisma.companyAccount.findUnique({
      where: { companyCode: SHARED_LINE_CHANNEL_COMPANY_CODE },
    });
  }

  private sharedClient: messagingApi.MessagingApiClient | null = null;

  private async getClient(): Promise<messagingApi.MessagingApiClient | null> {
    if (this.sharedClient) return this.sharedClient;

    const company = await this.getSharedChannelCompany();

    if (!company?.lineChannelAccessToken) return null;

    this.sharedClient = new messagingApi.MessagingApiClient({
      channelAccessToken: company.lineChannelAccessToken,
    });

    return this.sharedClient;
  }

  /** 全社共有チャンネルの署名検証。テナント解決より前に行える */
  async verifySignatureShared(rawBody: Buffer, signature: string | undefined) {
    if (!signature) return false;

    const company = await this.getSharedChannelCompany();
    const secret = company?.lineChannelSecret;

    if (!secret) return false;

    return validateSignature(rawBody, secret, signature);
  }

  async handleEvents(events: webhook.Event[]) {
    for (const event of events) {
      await this.handleEvent(event).catch((err) =>
        this.logger.error('Failed to handle LINE event', err),
      );
    }
  }

  private async handleEvent(event: webhook.Event) {
    this.logger.log(`LINE event: ${event.type}`);

    if (!('replyToken' in event) || !event.replyToken) return;

    if (event.type === 'message' && event.message.type === 'text') {
      await this.handleTextMessage(
        event.replyToken,
        event.source?.type === 'user' ? event.source.userId : undefined,
        event.message.text,
      );
      return;
    }

    if (event.type === 'postback') {
      await this.handlePostback(
        event.replyToken,
        event.source?.type === 'user' ? event.source.userId : undefined,
        event.postback,
      );
      return;
    }

    if (event.type === 'follow') {
      await this.reply(event.replyToken, [
        {
          type: 'text',
          text:
            'ガレージ・カルテの公式アカウントを友だち追加いただきありがとうございます。\n' +
            'お店で発行された連携コード(GK-から始まる文字列)をこのトークに送信すると、お車の情報と連携されます。\n' +
            '複数の店舗をご利用の場合、それぞれのお店の連携コードを送ることで、1つのLINEで両方とやり取りできます。',
        },
      ]);
    }
  }

  private formatServiceHistoryReply(
    customer: {
      customerName: string;
      vehicles: {
        carName: string | null;
        commonModelName: string | null;
        registrationNumber: string | null;
        serviceHistories: {
          date: Date;
          title: string;
          items: { name: string; cost: number }[];
        }[];
      }[];
    },
    shopLabel?: string,
  ): string {
    const lines: string[] = [];

    if (shopLabel) {
      lines.push(`【${shopLabel}】`);
    }

    lines.push(`🚗 ${customer.customerName}様の整備履歴`);

    let hasAny = false;

    for (const vehicle of customer.vehicles) {
      if (vehicle.serviceHistories.length === 0) continue;

      hasAny = true;

      const vehicleName = [vehicle.carName, vehicle.commonModelName]
        .filter(Boolean)
        .join(' ');

      lines.push(
        `\n【${vehicleName || '車両'}（${vehicle.registrationNumber ?? '登録番号未登録'}）】`,
      );

      for (const sh of vehicle.serviceHistories) {
        const dateStr = sh.date.toISOString().slice(0, 10);

        lines.push(`${dateStr} ${sh.title}`);

        for (const item of sh.items) {
          lines.push(`　・${item.name}`);
        }
      }
    }

    if (!hasAny) {
      lines.push('\nまだ整備履歴の記録がありません。');
    }

    return lines.join('\n');
  }

  private async findLinksForUser(lineUserId: string): Promise<LinkWithCompany[]> {
    return this.masterPrisma.lineCompanyLink.findMany({
      where: { lineUserId },
      include: { companyAccount: true },
      orderBy: { linkedAt: 'asc' },
    });
  }

  private async handleTextMessage(
    replyToken: string,
    lineUserId: string | undefined,
    text: string,
  ) {
    if (!lineUserId) return;

    const trimmed = text.trim();
    const upper = trimmed.toUpperCase();

    const staffJoinMatch = upper.match(STAFF_JOIN_PATTERN);

    if (staffJoinMatch) {
      await this.handleStaffJoin(replyToken, lineUserId, staffJoinMatch[1]);
      return;
    }

    const linkMatch = upper.match(LINK_TOKEN_PATTERN);

    if (linkMatch) {
      await this.handleLinkToken(replyToken, lineUserId, linkMatch[1], linkMatch[2], trimmed);
      return;
    }

    const staffLinks = await this.masterPrisma.lineStaffLink.findMany({
      where: { lineUserId },
      include: { companyAccount: true },
    });

    if (staffLinks.length > 0) {
      await this.handleStaffFreeText(replyToken, staffLinks, trimmed);
      return;
    }

    const links = await this.findLinksForUser(lineUserId);

    if (links.length === 0) {
      await this.reply(replyToken, [
        {
          type: 'text',
          text: 'まだ連携が完了していません。お店で発行された連携コードを送信してください。',
        },
      ]);
      return;
    }

    // 各社の連携が判明した時点で、届いたメッセージ自体は関係する全社のログに残す
    for (const link of links) {
      await this.withCompany(link.companyAccount, async () => {
        await this.logMessage(link.tenantCustomerId, 'IN', trimmed);
      });
    }

    if (trimmed === SERVICE_HISTORY_KEYWORD) {
      await this.replyAggregatedServiceHistory(replyToken, links);
      return;
    }

    if (trimmed === RESERVATION_KEYWORD) {
      if (links.length === 1) {
        await this.promptReservationCategory(
          replyToken,
          lineUserId,
          links[0].companyAccount,
          false,
        );
        return;
      }

      await this.reply(replyToken, [
        {
          type: 'text',
          text: 'どちらの店舗のご予約ですか？',
          quickReply: this.buildCompanyPickerQuickReply(links, RESERVATION_ACTION_PICK_COMPANY),
        },
      ]);
      return;
    }

    // その他のフリーテキストは、店舗を跨いだ処理をしていないので1社目の会社に絞ってAIが初期対応する
    const firstLink = links[0];

    if (links.length === 1) {
      await this.replyWithAiAssistant(replyToken, firstLink, trimmed);
      return;
    }

    await this.withCompany(firstLink.companyAccount, async () => {
      const customer = await this.customerService.findByLineUserId(lineUserId);

      await this.reply(
        replyToken,
        [
          {
            type: 'text',
            text: `受信しました:「${trimmed}」`,
            quickReply: mainMenuQuickReply,
          },
        ],
        customer?.id,
        links.length > 1 ? firstLink.companyAccount.displayName : undefined,
      );
    });
  }

  /**
   * お客様の自由文への初期対応をAI(OpenRouter)に任せる。日程の話が出ても
   * AIは提案・相談までとし、正式な予約は必ず既存の予約フローに誘導させる。
   * 呼び出しに失敗した場合は簡易な案内文にフォールバックし、必ず何かしら返信する。
   */
  private async replyWithAiAssistant(
    replyToken: string,
    link: LinkWithCompany,
    message: string,
  ) {
    await this.withCompany(link.companyAccount, async () => {
      const customer = await this.customerService.findByLineUserId(link.lineUserId);
      const fallback = async () => {
        await this.reply(
          replyToken,
          [
            {
              type: 'text',
              text: `受信しました:「${message}」\nスタッフが確認いたします。整備履歴の確認やご予約は下のボタンからどうぞ。`,
              quickReply: mainMenuQuickReply,
            },
          ],
          customer?.id,
        );
      };

      if (!customer) {
        await fallback();
        return;
      }

      try {
        const today = new Date();
        const twoWeeksLater = new Date(today);
        twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);

        const availability = await this.reservationService.getAvailabilityByDate(
          today,
          twoWeeksLater,
        );
        const availabilitySummary = this.formatAvailabilitySummary(availability);

        const vehicleSummary = customer.vehicles
          .map((v) => {
            const label = [v.carName, v.commonModelName].filter(Boolean).join(' ') || '車両';
            const lastHistory = v.serviceHistories[0];

            return lastHistory
              ? `${label}(直近整備: ${lastHistory.date.toISOString().slice(0, 10)} ${lastHistory.title})`
              : label;
          })
          .join('、');

        const recentMessages = await this.customerService.getLineMessages(customer.id);
        const history = recentMessages.slice(-10).map(
          (m): { role: 'user' | 'assistant'; content: string } => ({
            role: m.direction === 'IN' ? 'user' : 'assistant',
            content: m.text,
          }),
        );

        const systemInstruction =
          `あなたは${link.companyAccount.displayName}のLINE公式アカウントのカスタマーサポートです。` +
          `お客様: ${customer.customerName}様、ご登録車両: ${vehicleSummary || '登録なし'}。\n` +
          `今後2週間の空き状況の目安: ${availabilitySummary}\n` +
          `整備のご相談には丁寧に答えてください。日程の話が出た場合は上の空き状況を参考に提案・相談はしてよいですが、` +
          `あなた自身が予約を確定させてはいけません。正式なご予約は必ず「予約」という言葉を送っていただくよう案内してください。` +
          `返信は簡潔な日本語の文章のみとし、箇条書きの記号は多用しないでください。`;

        const replyText = await this.openRouterService.chat(history, message, systemInstruction);

        await this.reply(
          replyToken,
          [{ type: 'text', text: replyText, quickReply: mainMenuQuickReply }],
          customer.id,
        );
      } catch (err) {
        this.logger.warn(`AI初期応答の生成に失敗したため、簡易案内にフォールバックします: ${err}`);
        await fallback();
      }
    });
  }

  private formatAvailabilitySummary(
    availability: Map<string, 'OPEN' | 'FEW' | 'FULL' | 'CLOSED'>,
  ): string {
    const labels: Record<'OPEN' | 'FEW' | 'FULL' | 'CLOSED', string> = {
      OPEN: '空きあり',
      FEW: '残りわずか',
      FULL: '満枠',
      CLOSED: '休業',
    };

    return Array.from(availability.entries())
      .filter(([, status]) => status !== 'CLOSED')
      .slice(0, 14)
      .map(([date, status]) => `${date}(${labels[status]})`)
      .join('、') || '直近の空き情報なし';
  }

  private async handleLinkToken(
    replyToken: string,
    lineUserId: string,
    companyCode: string,
    suffix: string,
    rawText: string,
  ) {
    const token = `GK-${companyCode}-${suffix}`;

    const company = await this.masterPrisma.companyAccount.findUnique({
      where: { companyCode },
    });

    if (!company || !company.isActive) {
      await this.pushMessage(lineUserId, [
        {
          type: 'text',
          text: '連携コードが見つかりませんでした。お店にご確認ください。',
        },
      ]);
      return;
    }

    await this.withCompany(company, async () => {
      const customer = await this.customerService.findByLineLinkToken(token);

      if (!customer) {
        await this.pushMessage(lineUserId, [
          {
            type: 'text',
            text: '連携コードが見つかりませんでした。お店にご確認ください。',
          },
        ]);
        return;
      }

      await this.customerService.linkLineUser(customer.id, lineUserId);
      await this.logMessage(customer.id, 'IN', rawText);

      await this.masterPrisma.lineCompanyLink.upsert({
        where: {
          lineUserId_companyAccountId: {
            lineUserId,
            companyAccountId: company.id,
          },
        },
        update: { lastActiveAt: new Date() },
        create: {
          lineUserId,
          companyAccountId: company.id,
          tenantCustomerId: customer.id,
        },
      });

      const totalLinks = await this.masterPrisma.lineCompanyLink.count({
        where: { lineUserId },
      });

      // replyTokenは有効期限が短く失効しやすいため、連携完了の通知はpushで確実に送る
      await this.pushMessage(
        lineUserId,
        [
          {
            type: 'text',
            text: `${customer.customerName}様、${company.displayName}との連携が完了しました。\n車検満了日などをこちらのLINEでお知らせします。`,
            quickReply: mainMenuQuickReply,
          },
        ],
        totalLinks > 1 ? company.displayName : undefined,
      );
    });
  }

  /** 会社に1つの社員用参加コードを、無ければ生成して返す */
  async ensureStaffJoinCode(company: CompanyAccount): Promise<string> {
    if (company.staffJoinCode) return company.staffJoinCode;

    const code = Array.from(
      { length: 8 },
      () => STAFF_JOIN_CODE_CHARS[Math.floor(Math.random() * STAFF_JOIN_CODE_CHARS.length)],
    ).join('');

    await this.masterPrisma.companyAccount.update({
      where: { id: company.id },
      data: { staffJoinCode: code },
    });

    return code;
  }

  private async handleStaffJoin(replyToken: string, lineUserId: string, joinCode: string) {
    const company = await this.masterPrisma.companyAccount.findUnique({
      where: { staffJoinCode: joinCode },
    });

    if (!company || !company.isActive) {
      await this.pushMessage(
        lineUserId,
        [{ type: 'text', text: '社員用の参加コードが見つかりませんでした。お店にご確認ください。' }],
        undefined,
        true,
      );
      return;
    }

    await this.masterPrisma.lineStaffLink.upsert({
      where: {
        lineUserId_companyAccountId: {
          lineUserId,
          companyAccountId: company.id,
        },
      },
      update: {},
      create: { lineUserId, companyAccountId: company.id },
    });

    await this.pushMessage(
      lineUserId,
      [
        {
          type: 'text',
          text:
            `${company.displayName}のスタッフ用LINEとして連携しました。\n` +
            `毎朝6時ごろに、本日の予約と車検満了日が2ヶ月以内のお客様一覧をお送りします。`,
        },
      ],
      undefined,
      true,
    );
  }

  /**
   * 車検リマインドの毎朝リストの候補を組み立てる(現在のテナントコンテキストの会社が対象)。
   * 既に予約が入っている・見積が入庫している・スタッフが非表示にした車両は除外する。
   * StaffDigestServiceの一括送信と、スタッフの自由文による非表示判定の両方から使う。
   */
  async getShakenReminderCandidates(): Promise<ShakenReminderCandidate[]> {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { expirationDate: { not: null } },
      include: {
        customer: true,
        estimates: { where: { category: 'SHAKEN' } },
        reservations: {
          where: {
            status: { in: ['PENDING', 'CONFIRMED'] },
            scheduledStart: { gte: new Date() },
          },
        },
      },
    });

    const candidates: ShakenReminderCandidate[] = [];

    for (const vehicle of vehicles) {
      if (!vehicle.customer) continue;
      if (vehicle.estimates.length > 0) continue;
      if (vehicle.reservations.length > 0) continue;
      if (vehicle.shakenReminderDismissedFor === vehicle.expirationDate) continue;

      const date = parseFlexibleDate(vehicle.expirationDate);

      if (!date) continue;

      const remain = daysUntil(date);

      if (remain < 0 || remain > SHAKEN_REMINDER_WINDOW_DAYS) continue;

      candidates.push({
        vehicleId: vehicle.id,
        customerName: vehicle.customer.customerName,
        vehicleLabel:
          [vehicle.carName, vehicle.commonModelName].filter(Boolean).join(' ') || '車両',
        registrationNumber: vehicle.registrationNumber,
        phone: vehicle.customer.phone,
        address: vehicle.customer.customerAddress,
        expirationDate: vehicle.expirationDate!,
      });
    }

    return candidates;
  }

  private async handleStaffFreeText(
    replyToken: string,
    staffLinks: StaffLinkWithCompany[],
    message: string,
  ) {
    for (const link of staffLinks) {
      const matched = await this.withCompany(link.companyAccount, async () => {
        const candidates = await this.getShakenReminderCandidates();

        if (candidates.length === 0) return null;

        const vehicleId = await this.geminiService.matchDismissedVehicle(candidates, message);

        if (!vehicleId) return null;

        const candidate = candidates.find((c) => c.vehicleId === vehicleId);

        if (!candidate) return null;

        await this.prisma.vehicle.update({
          where: { id: vehicleId },
          data: { shakenReminderDismissedFor: candidate.expirationDate },
        });

        return candidate;
      });

      if (matched) {
        await this.reply(
          replyToken,
          [
            {
              type: 'text',
              text: `${matched.customerName}様（${matched.vehicleLabel}）の車検リマインドを非表示にしました。`,
            },
          ],
          undefined,
          undefined,
          true,
        );
        return;
      }
    }

    await this.reply(
      replyToken,
      [
        {
          type: 'text',
          text: '該当するお客様が分かりませんでした。お名前や車両名を含めて送ってください。',
        },
      ],
      undefined,
      undefined,
      true,
    );
  }

  /** 新しいLINE予約が入った時、その会社のスタッフ全員に即時通知する */
  async notifyStaffOfNewReservation(details: {
    customerName: string;
    vehicleLabel: string;
    category: string | null;
    needsLoanerCar: boolean | null;
    scheduledStart: Date;
  }) {
    const company = this.tenantContext.current()?.company;

    if (!company) return;

    const staffLinks = await this.masterPrisma.lineStaffLink.findMany({
      where: { companyAccountId: company.id },
    });

    if (staffLinks.length === 0) return;

    const loanerCarLine =
      details.needsLoanerCar === true
        ? '代車: 必要\n'
        : details.needsLoanerCar === false
          ? '代車: 不要\n'
          : '';

    const text =
      `📅 新しいご予約が入りました\n` +
      `${details.customerName}様${details.vehicleLabel ? ' ' + details.vehicleLabel : ''}\n` +
      (details.category ? `ご用件: ${details.category}\n` : '') +
      loanerCarLine +
      `希望日時: ${this.formatDateJst(details.scheduledStart)}`;

    for (const link of staffLinks) {
      try {
        await this.pushMessage(link.lineUserId, [{ type: 'text', text }], undefined, true);
      } catch (err) {
        this.logger.warn(`スタッフへの新規予約通知に失敗しました: ${err}`);
      }
    }
  }

  private async replyAggregatedServiceHistory(
    replyToken: string,
    links: LinkWithCompany[],
  ) {
    const sections: { companyAccountId: number; customerId: number; text: string }[] = [];

    for (const link of links) {
      const section = await this.withCompany(link.companyAccount, async () => {
        const customer = await this.customerService.findByLineUserId(link.lineUserId);

        if (!customer) return null;

        return {
          customerId: customer.id,
          text: this.formatServiceHistoryReply(
            customer,
            links.length > 1 ? link.companyAccount.displayName : undefined,
          ),
        };
      });

      if (section) {
        sections.push({ companyAccountId: link.companyAccountId, ...section });
      }
    }

    if (sections.length === 0) {
      await this.reply(replyToken, [
        {
          type: 'text',
          text: 'まだ整備履歴の記録がありません。',
          quickReply: mainMenuQuickReply,
        },
      ]);
      return;
    }

    const combinedText = sections.map((s) => s.text).join('\n\n');

    await this.reply(replyToken, [
      {
        type: 'text',
        text: combinedText,
        quickReply: mainMenuQuickReply,
      },
    ]);

    // 各社のログには、他社の情報が混ざらないようその会社の分だけを記録する
    for (const section of sections) {
      const link = links.find((l) => l.companyAccountId === section.companyAccountId)!;

      await this.withCompany(link.companyAccount, async () => {
        await this.logMessage(section.customerId, 'OUT', section.text);
      });
    }
  }

  private buildCompanyPickerQuickReply(
    links: LinkWithCompany[],
    action: string,
  ): messagingApi.QuickReply {
    return {
      items: links.slice(0, MAX_QUICK_REPLY_ITEMS).map((link) => ({
        type: 'action',
        action: {
          type: 'postback',
          label: link.companyAccount.displayName.slice(0, 20),
          data: `action=${action}&companyAccountId=${link.companyAccountId}`,
          displayText: link.companyAccount.displayName,
        },
      })),
    };
  }

  private async handlePostback(
    replyToken: string | undefined,
    lineUserId: string | undefined,
    postback: webhook.PostbackContent,
  ) {
    if (!replyToken || !lineUserId) return;

    const params = new URLSearchParams(postback.data);
    const action = params.get('action');
    const companyAccountIdStr = params.get('companyAccountId');
    const companyAccountId = companyAccountIdStr ? Number(companyAccountIdStr) : null;
    const category = params.get('category');

    if (action === RESERVATION_ACTION_PICK_COMPANY) {
      if (!companyAccountId) return;

      const company = await this.masterPrisma.companyAccount.findUnique({
        where: { id: companyAccountId },
      });

      if (!company) return;

      await this.promptReservationCategory(replyToken, lineUserId, company, true);
      return;
    }

    if (!companyAccountId) return;

    const company = await this.masterPrisma.companyAccount.findUnique({
      where: { id: companyAccountId },
    });

    if (!company) return;

    const links = await this.findLinksForUser(lineUserId);
    const showLabel = links.length > 1;

    if (action === RESERVATION_ACTION_PICK_CATEGORY) {
      await this.promptReservationDate(replyToken, lineUserId, company, showLabel, category);
      return;
    }

    if (action === RESERVATION_ACTION_PICK_DATE) {
      const date = params.get('date') ?? postback.params?.date;

      if (!date) return;

      await this.replyOpenSlots(replyToken, lineUserId, company, date, showLabel, category);
      return;
    }

    if (action === RESERVATION_ACTION_PICK_SLOT) {
      const start = params.get('start');

      if (!start) return;

      await this.promptLoanerCar(replyToken, company, start, showLabel, category);
      return;
    }

    if (action === RESERVATION_ACTION_SET_LOANER) {
      const start = params.get('start');
      const loaner = params.get('loaner');

      if (!start) return;

      const needsLoanerCar = loaner === 'yes' ? true : loaner === 'no' ? false : null;

      await this.confirmSlotSelection(
        replyToken,
        lineUserId,
        company,
        start,
        showLabel,
        category,
        needsLoanerCar,
      );
      return;
    }
  }

  /** 時間帯確定の直前に、代車の要否を尋ねる */
  private async promptLoanerCar(
    replyToken: string,
    company: CompanyAccount,
    startIso: string,
    showLabel: boolean,
    category?: string | null,
  ) {
    const categoryParam = category ? `&category=${encodeURIComponent(category)}` : '';
    const startParam = `&start=${encodeURIComponent(startIso)}`;
    const base = `action=${RESERVATION_ACTION_SET_LOANER}&companyAccountId=${company.id}${startParam}${categoryParam}`;

    await this.reply(
      replyToken,
      [
        {
          type: 'text',
          text: '代車のご希望はありますか？',
          quickReply: {
            items: [
              {
                type: 'action',
                action: {
                  type: 'postback',
                  label: '代車が必要',
                  data: `${base}&loaner=yes`,
                  displayText: '代車が必要',
                },
              },
              {
                type: 'action',
                action: {
                  type: 'postback',
                  label: '代車は不要',
                  data: `${base}&loaner=no`,
                  displayText: '代車は不要',
                },
              },
            ],
          },
        },
      ],
      undefined,
      showLabel ? company.displayName : undefined,
    );
  }

  private buildCategoryQuickReply(
    companyAccountId: number,
  ): messagingApi.QuickReply {
    return {
      items: RESERVATION_CATEGORIES.map((label) => ({
        type: 'action',
        action: {
          type: 'postback',
          label,
          data: `action=${RESERVATION_ACTION_PICK_CATEGORY}&companyAccountId=${companyAccountId}&category=${encodeURIComponent(label)}`,
          displayText: label,
        },
      })),
    };
  }

  private async promptReservationCategory(
    replyToken: string,
    lineUserId: string,
    company: CompanyAccount,
    showLabel: boolean,
  ) {
    await this.withCompany(company, async () => {
      const customer = await this.customerService.findByLineUserId(lineUserId);

      if (!customer) {
        await this.reply(replyToken, [
          {
            type: 'text',
            text: 'まだ連携が完了していません。お店で発行された連携コードを送信してください。',
          },
        ]);
        return;
      }

      await this.reply(
        replyToken,
        [
          {
            type: 'text',
            text: 'ご来店の目的を教えてください。',
            quickReply: this.buildCategoryQuickReply(company.id),
          },
        ],
        customer.id,
        showLabel ? company.displayName : undefined,
      );
    });
  }

  /** 予約可能な範囲を、月間カレンダー風のFlex Messageで組み立てる */
  private async buildCalendarFlexMessage(
    min: Date,
    max: Date,
    company: CompanyAccount,
    category?: string | null,
  ): Promise<messagingApi.FlexMessage> {
    const availability = await this.reservationService.getAvailabilityByDate(min, max);

    const months: { year: number; month: number }[] = [];
    const cursor = new Date(min.getFullYear(), min.getMonth(), 1);
    const last = new Date(max.getFullYear(), max.getMonth(), 1);

    while (cursor <= last) {
      months.push({ year: cursor.getFullYear(), month: cursor.getMonth() });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    const bubbles = months.map(({ year, month }) =>
      this.buildMonthBubble(year, month, min, max, availability, company, category),
    );

    return {
      type: 'flex',
      altText: 'ご希望の来店日をお選びください',
      contents:
        bubbles.length === 1
          ? bubbles[0]
          : { type: 'carousel', contents: bubbles },
    };
  }

  private buildMonthBubble(
    year: number,
    month: number,
    min: Date,
    max: Date,
    availability: Map<string, 'OPEN' | 'FEW' | 'FULL' | 'CLOSED'>,
    company: CompanyAccount,
    category?: string | null,
  ): messagingApi.FlexBubble {
    const categoryParam = category ? `&category=${encodeURIComponent(category)}` : '';
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startWeekday = new Date(year, month, 1).getDay();

    const minDay = new Date(min.getFullYear(), min.getMonth(), min.getDate());
    const maxDay = new Date(max.getFullYear(), max.getMonth(), max.getDate());

    const emptyCell = (): messagingApi.FlexBox => ({
      type: 'box',
      layout: 'vertical',
      flex: 1,
      contents: [{ type: 'text', text: ' ', size: 'xs' }],
    });

    const weekdayHeader: messagingApi.FlexBox = {
      type: 'box',
      layout: 'horizontal',
      contents: ['日', '月', '火', '水', '木', '金', '土'].map((label) => ({
        type: 'text',
        text: label,
        align: 'center',
        size: 'xs',
        color: '#999999',
        flex: 1,
      })),
    };

    const rows: messagingApi.FlexBox[] = [weekdayHeader];
    let currentRow: messagingApi.FlexBox[] = [];

    for (let i = 0; i < startWeekday; i++) {
      currentRow.push(emptyCell());
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const inRange = date >= minDay && date <= maxDay;
      const status = inRange ? (availability.get(dateStr) ?? 'CLOSED') : 'CLOSED';
      const bookable = status === 'OPEN' || status === 'FEW';

      const symbol = status === 'OPEN' ? '○' : status === 'FEW' ? '△' : '×';
      const symbolColor =
        status === 'OPEN' ? '#2E8B57' : status === 'FEW' ? '#E8A92E' : '#CCCCCC';

      currentRow.push({
        type: 'box',
        layout: 'vertical',
        flex: 1,
        cornerRadius: 'sm',
        backgroundColor: bookable ? '#FDE6DC' : undefined,
        paddingAll: 'xs',
        contents: [
          {
            type: 'text',
            text: String(day),
            align: 'center',
            size: 'xs',
            weight: bookable ? 'bold' : 'regular',
            color: bookable ? '#E8592E' : '#CCCCCC',
          },
          {
            type: 'text',
            text: inRange ? symbol : ' ',
            align: 'center',
            size: 'xs',
            color: symbolColor,
          },
        ],
        action: bookable
          ? {
              type: 'postback',
              data: `action=${RESERVATION_ACTION_PICK_DATE}&companyAccountId=${company.id}&date=${dateStr}${categoryParam}`,
              displayText: `${dateStr} を選択`,
            }
          : undefined,
      });

      if (currentRow.length === 7) {
        rows.push({ type: 'box', layout: 'horizontal', contents: currentRow });
        currentRow = [];
      }
    }

    if (currentRow.length > 0) {
      while (currentRow.length < 7) {
        currentRow.push(emptyCell());
      }

      rows.push({ type: 'box', layout: 'horizontal', contents: currentRow });
    }

    return {
      type: 'bubble',
      size: 'giga',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [{ type: 'text', text: `${year}年${month + 1}月`, weight: 'bold', size: 'md' }],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'xs',
        contents: rows,
      },
    };
  }

  private async promptReservationDate(
    replyToken: string,
    lineUserId: string,
    company: CompanyAccount,
    showLabel: boolean,
    category?: string | null,
  ) {
    await this.withCompany(company, async () => {
      const customer = await this.customerService.findByLineUserId(lineUserId);

      if (!customer) {
        await this.reply(replyToken, [
          {
            type: 'text',
            text: 'まだ連携が完了していません。お店で発行された連携コードを送信してください。',
          },
        ]);
        return;
      }

      const { min, max } = await this.reservationService.getBookableRange();
      const calendar = await this.buildCalendarFlexMessage(min, max, company, category);

      await this.reply(
        replyToken,
        [
          { type: 'text', text: 'ご希望の来店日をお選びください。' },
          calendar,
        ],
        customer.id,
        showLabel ? company.displayName : undefined,
      );
    });
  }

  private async replyOpenSlots(
    replyToken: string,
    lineUserId: string,
    company: CompanyAccount,
    dateStr: string,
    showLabel: boolean,
    category?: string | null,
  ) {
    await this.withCompany(company, async () => {
      const customer = await this.customerService.findByLineUserId(lineUserId);

      if (!customer) return;

      const allSlots = await this.reservationService.getAllSlotsWithStatus(dateStr);
      const { min, max } = await this.reservationService.getBookableRange();

      if (allSlots.length === 0 || !allSlots.some((s) => s.available)) {
        const calendar = await this.buildCalendarFlexMessage(min, max, company, category);

        await this.reply(
          replyToken,
          [
            { type: 'text', text: 'その日は空きがありません。別の日をお選びください。' },
            calendar,
          ],
          customer.id,
          showLabel ? company.displayName : undefined,
        );
        return;
      }

      const timeSlotMessage = this.buildTimeSlotFlexMessage(dateStr, allSlots, company, category);

      await this.reply(
        replyToken,
        [
          { type: 'text', text: `${dateStr} の空き時間からお選びください。` },
          timeSlotMessage,
        ],
        customer.id,
        showLabel ? company.displayName : undefined,
      );
    });
  }

  /** 指定日の全コマを、○(空き・タップ可)/×(埋まり)のFlex Messageグリッドでまとめる */
  private buildTimeSlotFlexMessage(
    dateStr: string,
    allSlots: { start: Date; end: Date; label: string; available: boolean }[],
    company: CompanyAccount,
    category?: string | null,
  ): messagingApi.FlexMessage {
    const categoryParam = category ? `&category=${encodeURIComponent(category)}` : '';

    const emptyCell = (): messagingApi.FlexBox => ({
      type: 'box',
      layout: 'vertical',
      flex: 1,
      contents: [{ type: 'text', text: ' ', size: 'xs' }],
    });

    const rows: messagingApi.FlexBox[] = [];
    let currentRow: messagingApi.FlexBox[] = [];

    for (const slot of allSlots) {
      currentRow.push({
        type: 'box',
        layout: 'vertical',
        flex: 1,
        cornerRadius: 'sm',
        backgroundColor: slot.available ? '#FDE6DC' : undefined,
        paddingAll: 'xs',
        contents: [
          {
            type: 'text',
            text: slot.label,
            align: 'center',
            size: 'xs',
            weight: slot.available ? 'bold' : 'regular',
            color: slot.available ? '#E8592E' : '#CCCCCC',
          },
          {
            type: 'text',
            text: slot.available ? '○' : '×',
            align: 'center',
            size: 'xs',
            color: slot.available ? '#2E8B57' : '#CCCCCC',
          },
        ],
        action: slot.available
          ? {
              type: 'postback',
              data: `action=${RESERVATION_ACTION_PICK_SLOT}&companyAccountId=${company.id}&start=${encodeURIComponent(slot.start.toISOString())}${categoryParam}`,
              displayText: `${dateStr} ${slot.label}`,
            }
          : undefined,
      });

      if (currentRow.length === 4) {
        rows.push({ type: 'box', layout: 'horizontal', contents: currentRow });
        currentRow = [];
      }
    }

    if (currentRow.length > 0) {
      while (currentRow.length < 4) {
        currentRow.push(emptyCell());
      }

      rows.push({ type: 'box', layout: 'horizontal', contents: currentRow });
    }

    return {
      type: 'flex',
      altText: `${dateStr} の空き時間`,
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [{ type: 'text', text: `${dateStr} の空き時間`, weight: 'bold', size: 'md' }],
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'xs',
          contents: rows,
        },
      },
    };
  }

  private async confirmSlotSelection(
    replyToken: string,
    lineUserId: string,
    company: CompanyAccount,
    startIso: string,
    showLabel: boolean,
    category?: string | null,
    needsLoanerCar?: boolean | null,
  ) {
    await this.withCompany(company, async () => {
      const customer = await this.customerService.findByLineUserId(lineUserId);

      if (!customer) return;

      try {
        const reservation = await this.reservationService.createFromLineRequest(
          customer.id,
          new Date(startIso),
          category,
          needsLoanerCar,
        );

        const loanerLine =
          needsLoanerCar === true
            ? '代車: 必要\n'
            : needsLoanerCar === false
              ? '代車: 不要\n'
              : '';

        await this.reply(
          replyToken,
          [
            {
              type: 'text',
              text:
                `ご希望を受け付けました。\n` +
                (category ? `ご用件: ${category}\n` : '') +
                loanerLine +
                `${this.formatDateJst(reservation.scheduledStart)}\n` +
                `店舗からの確定連絡をお待ちください。`,
              quickReply: mainMenuQuickReply,
            },
          ],
          customer.id,
          showLabel ? company.displayName : undefined,
        );
      } catch (err: any) {
        const { min, max } = await this.reservationService.getBookableRange();
        const calendar = await this.buildCalendarFlexMessage(min, max, company, category);

        await this.reply(
          replyToken,
          [
            {
              type: 'text',
              text: `${err?.message ?? 'ご希望の時間帯では予約できませんでした。'}\n別の日時をお選びください。`,
            },
            calendar,
          ],
          customer.id,
          showLabel ? company.displayName : undefined,
        );
      }
    });
  }

  private formatDateJst(date: Date) {
    const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    const [datePart, timePart] = jst.toISOString().slice(0, 16).split('T');
    return `${datePart} ${timePart}`;
  }

  private prefixShopLabel(
    messages: messagingApi.Message[],
    shopLabel: string,
  ): messagingApi.Message[] {
    return messages.map((m) =>
      m.type === 'text' ? { ...m, text: `【${shopLabel}】\n${m.text}` } : m,
    );
  }

  /** スタッフ向けメッセージの最後に、アプリを開くボタンを付ける */
  private withAppLinkQuickReply(messages: messagingApi.Message[]): messagingApi.Message[] {
    const appLinkItem: messagingApi.QuickReplyItem = {
      type: 'action',
      action: {
        type: 'uri',
        label: '🔧 ガレージ・カルテを開く',
        uri: process.env.PUBLIC_APP_URL ?? 'https://app.dreamgaragelite.com',
      },
    };

    return messages.map((m, i) => {
      if (m.type !== 'text' || i !== messages.length - 1) return m;

      const existingItems = m.quickReply?.items ?? [];

      return {
        ...m,
        quickReply: {
          items: [...existingItems, appLinkItem].slice(0, MAX_QUICK_REPLY_ITEMS),
        },
      };
    });
  }

  /** 予約プッシュ通知等、返信トークンを使わずメッセージを送る */
  async pushMessage(
    lineUserId: string,
    messages: messagingApi.Message[],
    shopLabel?: string,
    appLinkButton?: boolean,
  ) {
    const client = await this.getClient();

    if (!client) {
      this.logger.warn(
        'LINEチャンネルが未設定のため、プッシュ通知をスキップしました。',
      );
      return;
    }

    let finalMessages = shopLabel ? this.prefixShopLabel(messages, shopLabel) : messages;

    if (appLinkButton) finalMessages = this.withAppLinkQuickReply(finalMessages);

    await client.pushMessage({ to: lineUserId, messages: finalMessages });

    // テナントコンテキストが確立されている(会社が判明している)時だけログを残せる
    if (this.tenantContext.current()) {
      const customer = await this.customerService.findByLineUserId(lineUserId);

      if (customer) {
        await this.logOutgoing(customer.id, finalMessages);
      }
    }
  }

  private async reply(
    replyToken: string,
    messages: messagingApi.Message[],
    customerId?: number,
    shopLabel?: string,
    appLinkButton?: boolean,
  ) {
    const client = await this.getClient();

    if (!client) {
      this.logger.warn(
        'LINEチャンネルが未設定のため、返信をスキップしました。',
      );
      return;
    }

    let finalMessages = shopLabel ? this.prefixShopLabel(messages, shopLabel) : messages;

    if (appLinkButton) finalMessages = this.withAppLinkQuickReply(finalMessages);

    await client.replyMessage({ replyToken, messages: finalMessages });

    if (customerId && this.tenantContext.current()) {
      await this.logOutgoing(customerId, finalMessages);
    }
  }

  private async logOutgoing(customerId: number, messages: messagingApi.Message[]) {
    for (const m of messages) {
      if (m.type === 'text') {
        await this.logMessage(customerId, 'OUT', m.text);
      }
    }
  }

  private async logMessage(customerId: number, direction: 'IN' | 'OUT', text: string) {
    if (!this.tenantContext.current()) return;

    try {
      await this.prisma.lineMessage.create({ data: { customerId, direction, text } });
    } catch (err) {
      this.logger.error('Failed to log LINE message', err as Error);
    }
  }
}
