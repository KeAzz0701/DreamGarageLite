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
import { BusinessHoursService } from '../reservation/business-hours.service';
import { parseFlexibleDate, daysUntil } from '../common/japanese-date';
import { TenantContextService } from '../tenant/tenant-context.service';
import { PrismaService } from '../prisma/prisma.service';
import { MasterPrismaService } from '../prisma/master-prisma.service';
import { GeminiService } from '../gemini/gemini.service';
import { OpenRouterService } from '../openrouter/openrouter.service';
import { LicenseService } from '../license/license.service';
import { AnnouncementService } from '../announcement/announcement.service';
import { SystemAdminLineService } from '../system-admin-line/system-admin-line.service';

// 全社共有のLINE公式アカウントは、実際に稼働しているDream Garage社のチャンネルをそのまま使う
const SHARED_LINE_CHANNEL_COMPANY_CODE = 'ZK5NBWM4';

// GK-<会社コード>-<ランダム6文字>。会社コードを直接埋め込むことで、
// 全社DB総当たりせずにトークンからどの会社宛てか判別できる
const LINK_TOKEN_PATTERN = /^GK-([A-Z0-9]{3,20})-([A-Z0-9]{6})$/;
// GKSTAFF-<会社の社員用参加コード>。会社に1つの固定コードを社員間で使い回す
const STAFF_JOIN_PATTERN = /^GKSTAFF-([A-Z0-9]{6,20})$/;
// 「GKSTAFF-」を付けずコード部分だけ送ってしまうケースを拾うためのゆるいパターン。
// 実際に既存の参加コードとDB上で一致した場合のみ有効にする(通常の自由文と誤判定しないように)
const BARE_STAFF_CODE_PATTERN = /^[A-Z0-9]{6,20}$/;
const STAFF_JOIN_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const STAFF_ACCESS_CODE_LENGTH = 10;
// 顧客詳細のLINE画面は開いている間5秒間隔でポーリングするため、その間隔より
// 十分長い(=閉じたら速やかに「見ていない」判定に戻る)しきい値にする
const STAFF_VIEWING_THRESHOLD_MS = 15_000;
const STAFF_ENTRY_ID_KEYWORD = '入室ID';
const SERVICE_HISTORY_KEYWORD = '整備履歴';
const RESERVATION_KEYWORD = '予約';
const ANNOUNCEMENT_KEYWORD = 'お知らせ';
const RECOMMEND_KEYWORD_HIRAGANA = 'おすすめ';
const RECOMMEND_KEYWORD_KATAKANA = 'オススメ';
// 車が動かせない・事故等ですぐ連絡が要りそうな自由文を拾うキーワード(単純な部分一致)
const EMERGENCY_KEYWORDS = [
  '緊急',
  '故障',
  '事故',
  '動かない',
  '動かせない',
  'パンク',
  'バッテリー上がり',
  'エンスト',
  '立ち往生',
  'レッカー',
  '牽引',
  'JAF',
  'ロードサービス',
];
// 日本自動車連盟(JAF)ロードサービス要請用の全国共通番号。会社ごとの設定は不要
const JAF_PHONE = '#8139(携帯) / 0570-00-8139';
const RESERVATION_ACTION_PICK_COMPANY = 'reserve_pick_company';
const RESERVATION_ACTION_PICK_CATEGORY = 'reserve_pick_category';
const RESERVATION_ACTION_PICK_DATE = 'reserve_pick_date';
const RESERVATION_ACTION_PICK_SLOT = 'reserve_pick_slot';
const RESERVATION_ACTION_SET_LOANER = 'reserve_set_loaner';
const RESERVATION_ACTION_MAIN_CHOICE = 'reserve_main_choice';
const ANNOUNCEMENT_ACTION_SHOW = 'announcement_show';
const RECOMMEND_ACTION_SHOW = 'recommend_show';
const IMAGE_ACTION_PICK_COMPANY = 'image_pick_company';
const SWITCH_ACTION_PICK_COMPANY = 'switch_pick_company';
const SHAKEN_REMINDER_ACTION_RESERVE = 'shaken_reminder_reserve';
const SHAKEN_REMINDER_ACTION_DISMISS = 'shaken_reminder_dismiss';
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
const MAINTENANCE_REMINDER_WINDOW_DAYS = 14;
/** 既定のリマインド種類にはなじみやすいアイコンを、会社が自由に追加した種類には汎用アイコンを使う */
const MAINTENANCE_TYPE_ICON: Record<string, string> = {
  'オイル交換': '🛢',
  'タイヤ交換': '🛞',
};

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

// 社員専用メニュー。整備履歴・ご予約などお客様向けボタンとは完全に分ける。
// 入室関連以外の社員向け機能もここに足していく想定。
// 「🔑 入室する」はLIFF(LINEの内蔵ブラウザ限定)ではなく、あえて普通のhttps
// リンクにすることで、Android/iPhoneを問わずどのブラウザでも開けて自動ログインできるようにする
function buildStaffMenuQuickReply(staffAccessCode?: string): messagingApi.QuickReply {
  const items: messagingApi.QuickReplyItem[] = [
    {
      type: 'action',
      action: {
        type: 'message',
        label: '🆔 入室IDを表示',
        text: STAFF_ENTRY_ID_KEYWORD,
      },
    },
  ];

  if (staffAccessCode) {
    const appUrl = process.env.PUBLIC_APP_URL ?? 'https://app.dreamgaragelite.com';

    items.unshift({
      type: 'action',
      action: {
        type: 'uri',
        label: '🔑 入室する',
        uri: `${appUrl}/login?staffCode=${encodeURIComponent(staffAccessCode)}`,
      },
    });
  }

  return { items };
}

/**
 * 顧客ポータルへの入口ボタン。LIFF専用リンクではなく通常のhttpsリンクにしているのは、
 * frontend/lib/portal-liff.tsのinitLiff()がwithLoginOnExternalBrowser:trueで
 * 初期化しているため、LINE内蔵ブラウザ以外(通常のブラウザ)からでも認証できるため。
 * お客様専用の導線であり、社員向けメニューには含めない。
 */
function buildPortalQuickReplyItem(): messagingApi.QuickReplyItem {
  const appUrl = process.env.PUBLIC_APP_URL ?? 'https://app.dreamgaragelite.com';

  return {
    type: 'action',
    action: {
      type: 'uri',
      label: '🌐 マイページを開く',
      uri: `${appUrl}/portal`,
    },
  };
}

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
  customerId: number;
  customerName: string;
  vehicleLabel: string;
  registrationNumber: string | null;
  phone: string | null;
  address: string | null;
  expirationDate: string;
  daysRemaining: number;
};

export type MaintenanceReminderCandidate = {
  vehicleId: number;
  customerId: number;
  customerName: string;
  vehicleLabel: string;
  registrationNumber: string | null;
  dueLabel: string;
  recommendElement?: boolean;
};

@Injectable()
export class LineService {
  private readonly logger = new Logger(LineService.name);

  constructor(
    @Inject(forwardRef(() => CustomerService))
    private readonly customerService: CustomerService,
    @Inject(forwardRef(() => ReservationService))
    private readonly reservationService: ReservationService,
    private readonly businessHoursService: BusinessHoursService,
    private readonly tenantContext: TenantContextService,
    private readonly prisma: PrismaService,
    private readonly masterPrisma: MasterPrismaService,
    private readonly geminiService: GeminiService,
    private readonly openRouterService: OpenRouterService,
    private readonly licenseService: LicenseService,
    private readonly announcementService: AnnouncementService,
    private readonly systemAdminLineService: SystemAdminLineService,
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

  private sharedBlobClient: messagingApi.MessagingApiBlobClient | null = null;

  /** 画像等のメッセージコンテンツをダウンロードするための専用クライアント */
  private async getBlobClient(): Promise<messagingApi.MessagingApiBlobClient | null> {
    if (this.sharedBlobClient) return this.sharedBlobClient;

    const company = await this.getSharedChannelCompany();

    if (!company?.lineChannelAccessToken) return null;

    this.sharedBlobClient = new messagingApi.MessagingApiBlobClient({
      channelAccessToken: company.lineChannelAccessToken,
    });

    return this.sharedBlobClient;
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

    if (event.type === 'message' && event.message.type === 'image') {
      await this.handleImageMessage(
        event.replyToken,
        event.source?.type === 'user' ? event.source.userId : undefined,
        event.message.id,
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

  /** links[0]が「最後にやり取りのあった店舗」になるよう、lastActiveAt降順で返す。顧客ポータルからも使う */
  async findLinksForUser(lineUserId: string): Promise<LinkWithCompany[]> {
    return this.masterPrisma.lineCompanyLink.findMany({
      where: { lineUserId },
      include: { companyAccount: true },
      orderBy: { lastActiveAt: 'desc' },
    });
  }

  /** (lineUserId, companyAccountId)の組み合わせの最終活動日時を更新する。存在しない組み合わせなら黙って無視する */
  async touchCompanyLinkActivity(lineUserId: string, companyAccountId: number) {
    await this.masterPrisma.lineCompanyLink
      .update({
        where: { lineUserId_companyAccountId: { lineUserId, companyAccountId } },
        data: { lastActiveAt: new Date() },
      })
      .catch(() => {});
  }

  /** LIFFから送られてきたIDトークンをLINE側で検証し、確認できたlineUserId(sub)を返す。失敗時はnull */
  async verifyLiffIdToken(idToken: string): Promise<string | null> {
    const liffChannelId = process.env.LIFF_CHANNEL_ID;

    if (!liffChannelId) return null;

    const res = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id_token: idToken, client_id: liffChannelId }),
    });

    if (!res.ok) return null;

    const payload = await res.json();
    return typeof payload.sub === 'string' ? payload.sub : null;
  }

  private async handleTextMessage(
    replyToken: string,
    lineUserId: string | undefined,
    text: string,
  ) {
    if (!lineUserId) return;

    const trimmed = text.trim();
    const upper = trimmed.toUpperCase();

    // 運営者本人が管理画面で発行した登録コードと一致するかを、他のどの処理より先に確認する。
    // 会社に紐づかないシステムレベルの操作のため、テナント文脈の解決より前に行う
    if (await this.systemAdminLineService.tryConsumeCode(lineUserId, trimmed)) {
      await this.reply(replyToken, [
        { type: 'text', text: '✅ 運営者としてLINE通知の登録が完了しました。' },
      ]);
      return;
    }

    const staffJoinMatch = upper.match(STAFF_JOIN_PATTERN);

    if (staffJoinMatch) {
      await this.handleStaffJoin(replyToken, lineUserId, staffJoinMatch[1]);
      return;
    }

    // 「GKSTAFF-」を付け忘れてコード部分だけ送ってきた場合の救済。
    // 実在する参加コードと一致した時だけ反応し、それ以外の自由文には影響しない
    if (BARE_STAFF_CODE_PATTERN.test(upper)) {
      const matchedCompany = await this.masterPrisma.companyAccount.findUnique({
        where: { staffJoinCode: upper },
      });

      if (matchedCompany) {
        await this.handleStaffJoin(replyToken, lineUserId, upper);
        return;
      }
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

    const links = await this.findLinksForUser(lineUserId);

    if (staffLinks.length === 0 && links.length === 0) {
      await this.reply(replyToken, [
        {
          type: 'text',
          text: 'まだ連携が完了していません。お店で発行された連携コードを送信してください。',
        },
      ]);
      return;
    }

    // お客様として連携している場合、届いたメッセージ自体は関係する全社のログに残す
    for (const link of links) {
      await this.withCompany(link.companyAccount, async () => {
        await this.logMessage(link.tenantCustomerId, 'IN', trimmed);
      });
    }

    // 故障・事故等ですぐ連絡が要りそうな内容は、AIの応答を待たず最優先で
    // 連絡先(営業時間内なら店舗電話、時間外なら緊急連絡先・JAF等)を案内する
    if (links.length > 0 && EMERGENCY_KEYWORDS.some((kw) => trimmed.includes(kw))) {
      await this.replyEmergencyContact(replyToken, links);
      return;
    }

    // 「整備履歴」「予約」はスタッフ向けの自由文と紛れることが無い明確なお客様コマンドのため、
    // スタッフとしても連携されている(同一人物がお客様兼スタッフの)場合でも必ずお客様コマンドとして扱う
    // 完全一致だけでなく、「整備履歴を教えて」「予約確認したい」のような
    // 似た自由文でもキーワードが含まれていれば同じ案内につなげる
    if (links.length > 0 && trimmed.includes(SERVICE_HISTORY_KEYWORD)) {
      await this.replyAggregatedServiceHistory(replyToken, links);
      return;
    }

    if (links.length > 0 && trimmed.includes(RESERVATION_KEYWORD)) {
      // 「予約確認したい」のように明確に確認の意図がある場合だけ確認画面へ。
      // それ以外の「予約」「予約して」等は、間に選択画面を挟まず直接新規予約に入る
      if (trimmed.includes('確認')) {
        await this.replyAggregatedReservationStatus(replyToken, links);
      } else {
        await this.startNewReservationFlow(replyToken, lineUserId, links);
      }
      return;
    }

    if (links.length > 0 && trimmed.includes(ANNOUNCEMENT_KEYWORD)) {
      await this.replyAnnouncements(replyToken, lineUserId, links);
      return;
    }

    if (
      links.length > 0 &&
      (trimmed.includes(RECOMMEND_KEYWORD_HIRAGANA) || trimmed.includes(RECOMMEND_KEYWORD_KATAKANA))
    ) {
      await this.replyRecommendMenu(replyToken, lineUserId, links);
      return;
    }

    // 社員が入室ID(ガレージ・カルテへのログイン用)を確認したい場合
    if (staffLinks.length > 0 && trimmed.includes(STAFF_ENTRY_ID_KEYWORD)) {
      await this.replyStaffAccessCodes(replyToken, staffLinks);
      return;
    }

    // スタッフとしても連携している場合は、まず車検リマインド非表示の自由文として解釈を試みる。
    // 該当が無ければ、お客様として連携があるならお客様向けの案内へフォールバックする
    // (お客様兼スタッフの人が「該当なし」で会話を行き止まりにされないようにするため)
    if (staffLinks.length > 0) {
      const handled = await this.handleStaffFreeText(replyToken, staffLinks, trimmed);

      if (handled) return;

      if (links.length === 0) {
        // 1社にしか連携が無ければその入室IDを直接ボタンに埋め込む。複数社の場合はどちらか
        // 決められないので、「入室ID」ボタンから個別に確認してもらう
        const singleCode = staffLinks.length === 1 ? staffLinks[0].staffAccessCode ?? undefined : undefined;

        await this.reply(replyToken, [
          {
            type: 'text',
            text: 'ガレージ・カルテには「🔑 入室する」ボタン、または「入室ID」と送ると確認できる入室IDから入れます。',
            quickReply: buildStaffMenuQuickReply(singleCode),
          },
        ]);
        return;
      }
    }

    // その他のフリーテキストは、直近やり取りのあった店舗(links[0]、lastActiveAt降順)にAIが応答する。
    // 複数店舗と連携している場合は、返信に他店舗へ切り替えるボタンを添える
    await this.replyWithAiAssistant(replyToken, links, trimmed);
  }

  /**
   * 故障・事故等の緊急ワードを検知した時の返信。営業時間内なら店舗の電話番号、
   * 時間外なら会社側で設定した緊急連絡先とJAF等ロードサービスの連絡先を案内する。
   * AIの生成を待たず即座に返す(緊急時にAI応答の遅延・不確実さを挟まないため)
   */
  private async replyEmergencyContact(replyToken: string, links: LinkWithCompany[]) {
    const link = links[0];

    await this.withCompany(link.companyAccount, async () => {
      const customer = await this.customerService.findByLineUserId(link.lineUserId);

      const [company, settings, withinBusinessHours] = await Promise.all([
        this.prisma.company.findFirst(),
        this.prisma.settings.findFirst(),
        this.businessHoursService.isWithinBusinessHoursNow(),
      ]);

      const lines: string[] = ['🚨 緊急のご連絡でしょうか。'];

      if (withinBusinessHours && company?.phone) {
        lines.push('ただいまの時間でしたら、下記までお電話ください。');
        lines.push(`📞 ${company.phone}`);
      } else {
        lines.push('恐れ入りますが、ただいま営業時間外です。');

        if (settings?.emergencyContactPhone) {
          lines.push(`緊急連絡先: 📞 ${settings.emergencyContactPhone}`);
        }

        lines.push('お車が動かせない状況でしたら、JAF等のロードサービスもご検討ください。');
        lines.push(`📞 JAF(日本自動車連盟): ${JAF_PHONE}`);
      }

      await this.reply(
        replyToken,
        [{ type: 'text', text: lines.join('\n') }],
        customer?.id,
        link.companyAccount.displayName,
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
    links: LinkWithCompany[],
    message: string,
  ) {
    const link = links[0];
    const quickReply = this.withSwitchCompanyOptions(mainMenuQuickReply, links, link.companyAccountId);

    await this.withCompany(link.companyAccount, async () => {
      const customer = await this.customerService.findByLineUserId(link.lineUserId);
      const fallback = async () => {
        await this.reply(
          replyToken,
          [
            {
              type: 'text',
              text: 'メッセージを受け付けました。スタッフが確認いたします。整備履歴の確認やご予約は下のボタンからどうぞ。',
              quickReply,
            },
          ],
          customer?.id,
          link.companyAccount.displayName,
        );
      };

      if (!customer) {
        await fallback();
        return;
      }

      // スタッフが「今まさに」この顧客とのLINE画面を開いている間は、AIも「担当者対応中」の
      // 案内も一切出さず完全に沈黙する(見ている本人がそのまま返信するため)。
      // 画面を開いていない/他の顧客の画面を見ている場合はこの判定に該当せず、通常通り案内する
      if (
        customer.lineScreenViewedAt &&
        Date.now() - customer.lineScreenViewedAt.getTime() < STAFF_VIEWING_THRESHOLD_MS
      ) {
        return;
      }

      // スタッフが直接返信した直後は、しばらくAIを止めて担当者対応を優先する。
      // ただし案内文は今回の対応で最初の1通だけ送り、以降は何も返さない
      // (スタッフが実際にやり取りしている最中に、この案内が毎回割り込んでこないようにするため)
      if (customer.aiPausedUntil && customer.aiPausedUntil > new Date()) {
        if (!customer.aiPauseNoticeSentAt) {
          await this.reply(
            replyToken,
            [
              {
                type: 'text',
                text: 'メッセージを受け取りました。ただいま担当者が対応しておりますので、少々お待ちください。',
                quickReply,
              },
            ],
            customer.id,
            link.companyAccount.displayName,
          );

          await this.prisma.customer.update({
            where: { id: customer.id },
            data: { aiPauseNoticeSentAt: new Date() },
          });
        }

        return;
      }

      const limits = await this.licenseService.getCurrentPlanLimits();

      if (limits && !limits.aiChat) {
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
          [{ type: 'text', text: replyText, quickReply }],
          customer.id,
          link.companyAccount.displayName,
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

  /**
   * お客様が送った車検証等の画像をOCRし、スタッフの確認待ちとして保存する。
   * その場で車両として確定登録はしない(誤登録防止のため、必ずスタッフの確認を挟む)。
   */
  private async handleImageMessage(
    replyToken: string,
    lineUserId: string | undefined,
    messageId: string,
  ) {
    if (!lineUserId) return;

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

    if (links.length > 1) {
      await this.reply(replyToken, [
        {
          type: 'text',
          text: 'どちらの店舗宛ての画像ですか？',
          quickReply: this.buildCompanyPickerQuickReply(
            links,
            IMAGE_ACTION_PICK_COMPANY,
            `&messageId=${encodeURIComponent(messageId)}`,
          ),
        },
      ]);
      return;
    }

    await this.processVehicleImage(replyToken, lineUserId, links[0].companyAccount, messageId, true);
  }

  /** 画像(車検証等)をOCRしてスタッフ確認待ちとして保存する。会社が確定した後に呼ばれる */
  private async processVehicleImage(
    replyToken: string,
    lineUserId: string,
    company: CompanyAccount,
    messageId: string,
    showLabel: boolean,
  ) {
    await this.withCompany(company, async () => {
      const customer = await this.customerService.findByLineUserId(lineUserId);

      if (!customer) {
        await this.reply(replyToken, [
          { type: 'text', text: 'お客様情報が見つかりませんでした。店舗までご連絡ください。' },
        ]);
        return;
      }

      // Web版アップロード(LicenseGuard/LicenseInterceptor)と同じ月間OCR上限を、
      // LINE経由の画像投稿にも適用する(以前はここが未チェックで上限が無意味だった)
      const tenantCompany = await this.prisma.company.findFirst();
      const canUse = tenantCompany
        ? await this.licenseService.canUseOcr(tenantCompany.id)
        : true;

      if (!canUse) {
        await this.reply(
          replyToken,
          [
            {
              type: 'text',
              text: '今月のOCR利用上限に達しているため、この画像は処理できませんでした。店舗までご連絡ください。',
            },
          ],
          customer.id,
          showLabel ? company.displayName : undefined,
        );
        return;
      }

      try {
        const blobClient = await this.getBlobClient();

        if (!blobClient) {
          throw new Error('LINEチャンネルが未設定のため、画像を取得できません。');
        }

        const content = await blobClient.getMessageContentWithHttpInfo(messageId);
        const mimeType = content.httpResponse.headers.get('content-type') || 'image/jpeg';

        const chunks: Buffer[] = [];

        for await (const chunk of content.body) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }

        const buffer = Buffer.concat(chunks);
        const base64 = buffer.toString('base64');

        const apiKey = await this.licenseService.getApiKey(company.id);
        const text = await this.geminiService.analyzeImage(base64, mimeType, apiKey ?? undefined);
        const extractedData = JSON.parse(text);

        const submission = await this.prisma.lineOcrSubmission.create({
          data: {
            customerId: customer.id,
            imageData: buffer,
            mimeType,
            extractedData,
            status: 'PENDING',
          },
        });

        if (tenantCompany) {
          await this.licenseService.incrementOcr(tenantCompany.id);
        }

        await this.logMessage(customer.id, 'IN', '[画像: 車検証OCR]', submission.id);

        await this.reply(
          replyToken,
          [
            {
              type: 'text',
              text: '車検証の画像を受け取りました。内容を確認のうえ登録いたします。',
              quickReply: mainMenuQuickReply,
            },
          ],
          customer.id,
          showLabel ? company.displayName : undefined,
        );

        const staffLinks = await this.masterPrisma.lineStaffLink.findMany({
          where: { companyAccountId: company.id },
        });

        for (const staffLink of staffLinks) {
          try {
            await this.pushMessage(
              staffLink.lineUserId,
              [
                {
                  type: 'text',
                  text: `🚗 ${customer.customerName}様から車検証の画像が届きました。確認して登録してください。`,
                },
              ],
              undefined,
              true,
            );
          } catch (err) {
            this.logger.warn(`スタッフへの車検証画像通知に失敗しました: ${err}`);
          }
        }
      } catch (err) {
        this.logger.warn(`車検証画像の解析に失敗しました: ${err}`);

        await this.reply(
          replyToken,
          [
            {
              type: 'text',
              text: '画像の解析に失敗しました。恐れ入りますが、店舗まで直接ご連絡ください。',
              quickReply: mainMenuQuickReply,
            },
          ],
          customer.id,
        );
      }
    });
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

      // 既に車両登録済みなら、連携完了と同時に車検満了日も一度お知らせする
      const vehicles = await this.prisma.vehicle.findMany({
        where: { customerId: customer.id },
      });

      const shakenLines = vehicles
        .filter((v) => v.expirationDate)
        .map((v) => {
          const label = [v.carName, v.commonModelName].filter(Boolean).join(' ') || '車両';
          return `${label}: ${v.expirationDate}`;
        });

      const shakenText =
        shakenLines.length > 0
          ? `\n\n🚗 車検満了日\n${shakenLines.join('\n')}`
          : '\n車検満了日などをこちらのLINEでお知らせします。';

      // replyTokenは有効期限が短く失効しやすいため、連携完了の通知はpushで確実に送る
      await this.pushMessage(
        lineUserId,
        [
          {
            type: 'text',
            text: `${customer.customerName}様、${company.displayName}との連携が完了しました。${shakenText}`,
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

  /** 設定画面に表示する、この会社に連携済みのスタッフ一覧 */
  async listStaffLinks(company: CompanyAccount) {
    return this.masterPrisma.lineStaffLink.findMany({
      where: { companyAccountId: company.id },
      orderBy: { joinedAt: 'asc' },
      select: { id: true, displayName: true, joinedAt: true, staffAccessCode: true },
    });
  }

  /** 設定画面から、この会社のスタッフ連携を解除する(他社のリンクは触れない)。
   *  この行の削除自体が、ガレージ・カルテへのログイン権限の即時取り消しになる */
  async removeStaffLink(company: CompanyAccount, id: number) {
    await this.masterPrisma.lineStaffLink.deleteMany({
      where: { id, companyAccountId: company.id },
    });
  }

  /** 設定画面から、入室IDを再発行する(紛失・漏えい時用) */
  async regenerateStaffAccessCode(company: CompanyAccount, id: number): Promise<string | null> {
    const link = await this.masterPrisma.lineStaffLink.findFirst({
      where: { id, companyAccountId: company.id },
    });

    if (!link) return null;

    return this.ensureStaffAccessCode(link.id, true);
  }

  /** スタッフ個人の入室ID(ログイン用)を、無ければ生成して返す */
  private async ensureStaffAccessCode(staffLinkId: number, forceRegenerate = false): Promise<string> {
    if (!forceRegenerate) {
      const existing = await this.masterPrisma.lineStaffLink.findUnique({
        where: { id: staffLinkId },
        select: { staffAccessCode: true },
      });

      if (existing?.staffAccessCode) return existing.staffAccessCode;
    }

    for (let attempt = 0; attempt < 10; attempt++) {
      const code = Array.from(
        { length: STAFF_ACCESS_CODE_LENGTH },
        () => STAFF_JOIN_CODE_CHARS[Math.floor(Math.random() * STAFF_JOIN_CODE_CHARS.length)],
      ).join('');

      try {
        const updated = await this.masterPrisma.lineStaffLink.update({
          where: { id: staffLinkId },
          data: { staffAccessCode: code },
        });

        return updated.staffAccessCode!;
      } catch {
        // ユニーク制約衝突。ごく低確率だが、その場合は別のコードで再試行する
      }
    }

    throw new Error('入室IDの生成に失敗しました。');
  }

  /** 「入室ID」と送ってきた社員へ、連携している全社分の入室IDを返信する */
  private async replyStaffAccessCodes(
    replyToken: string,
    staffLinks: { id: number; companyAccountId: number; staffAccessCode: string | null; companyAccount: CompanyAccount }[],
  ) {
    const lines: string[] = [];
    let firstCode: string | undefined;

    for (const link of staffLinks) {
      const code = link.staffAccessCode ?? (await this.ensureStaffAccessCode(link.id));
      lines.push(`${link.companyAccount.displayName}: ${code}`);
      firstCode ??= code;
    }

    const singleCode = staffLinks.length === 1 ? firstCode : undefined;

    await this.reply(replyToken, [
      {
        type: 'text',
        text: `🆔 入室ID\n${lines.join('\n')}\n\n「🔑 入室する」ボタンを押すと自動で入室できます。手入力する場合は、ガレージ・カルテのログイン画面で「スタッフとして入室」を選び、この入室IDを入力してください。`,
        quickReply: buildStaffMenuQuickReply(singleCode),
      },
    ]);
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

    const existingLink = await this.masterPrisma.lineStaffLink.findUnique({
      where: {
        lineUserId_companyAccountId: {
          lineUserId,
          companyAccountId: company.id,
        },
      },
    });

    // 新規参加の場合のみ、プランごとの人数上限をチェックする(コード再送・再参加は制限しない)
    if (!existingLink) {
      const currentStaffCount = await this.masterPrisma.lineStaffLink.count({
        where: { companyAccountId: company.id },
      });

      const limits = await this.withCompany(company, () =>
        this.licenseService.getCurrentPlanLimits(),
      );

      if (limits && currentStaffCount >= limits.maxUsers) {
        await this.pushMessage(
          lineUserId,
          [
            {
              type: 'text',
              text: `現在のプランでは社員として登録できる人数の上限(${limits.maxUsers}名)に達しています。プランのアップグレードが必要です。`,
            },
          ],
          undefined,
          true,
        );
        return;
      }
    }

    let displayName: string | null = null;

    try {
      const client = await this.getClient();
      const profile = await client?.getProfile(lineUserId);
      displayName = profile?.displayName ?? null;
    } catch (err) {
      this.logger.warn(`スタッフのLINEプロフィール取得に失敗しました: ${err}`);
    }

    const link = await this.masterPrisma.lineStaffLink.upsert({
      where: {
        lineUserId_companyAccountId: {
          lineUserId,
          companyAccountId: company.id,
        },
      },
      update: { displayName: displayName ?? undefined },
      create: { lineUserId, companyAccountId: company.id, displayName },
    });

    const staffAccessCode = await this.ensureStaffAccessCode(link.id);

    // 新規参加の時だけ、既に登録済みの他のスタッフへ知らせる(コード再送では通知しない)
    if (!existingLink) {
      const otherStaffLinks = await this.masterPrisma.lineStaffLink.findMany({
        where: { companyAccountId: company.id, lineUserId: { not: lineUserId } },
      });

      for (const staffLink of otherStaffLinks) {
        try {
          await this.pushMessage(
            staffLink.lineUserId,
            [
              {
                type: 'text',
                text: `🆕 ${displayName ?? '新しいスタッフ'}さんが社員として連携しました。`,
              },
            ],
            undefined,
            true,
          );
        } catch (err) {
          this.logger.warn(`新規スタッフ参加の通知に失敗しました: ${err}`);
        }
      }
    }

    await this.pushMessage(
      lineUserId,
      [
        {
          type: 'text',
          text:
            `${company.displayName}のスタッフ用LINEとして連携しました。\n` +
            `毎朝6時ごろに、本日の予約と車検満了日が2ヶ月以内のお客様一覧をお送りします。\n\n` +
            `🆔 入室ID: ${staffAccessCode}\n` +
            `「🔑 入室する」ボタン、またはガレージ・カルテのログイン画面でこの入室IDを入力すると、会社パスワードなしでログインできます。`,
          quickReply: buildStaffMenuQuickReply(staffAccessCode),
        },
      ],
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
        customerId: vehicle.customer.id,
        customerName: vehicle.customer.customerName,
        vehicleLabel:
          [vehicle.carName, vehicle.commonModelName].filter(Boolean).join(' ') || '車両',
        registrationNumber: vehicle.registrationNumber,
        phone: vehicle.customer.phone,
        address: vehicle.customer.customerAddress,
        expirationDate: vehicle.expirationDate!,
        daysRemaining: remain,
      });
    }

    return candidates;
  }

  /**
   * 整備リマインド(オイル交換・タイヤ交換など、会社ごとに追加・削除できる)の候補を組み立てる
   * (現在のテナントコンテキストの会社が対象)。`getShakenReminderCandidates`と同じ考え方
   * (予約が入っていれば除外、dismiss値が変われば復活)。
   *
   * 走行距離ベースの目安(km)は、現在の実走行距離をリアルタイムに把握する手段が無いため
   * (次回来店時に整備履歴として記録された時点でしか分からない)、自動判定には使わず、
   * 案内文に「目安走行距離」として参考表示するのみに留める。自動判定は月数ベースのみで行う。
   */
  async getMaintenanceReminderCandidates(reminderType: {
    id: number;
    name: string;
    intervalMonths: number | null;
    intervalKm: number | null;
  }): Promise<MaintenanceReminderCandidate[]> {
    const { intervalMonths, intervalKm } = reminderType;

    if (!intervalMonths && !intervalKm) return [];

    const categoryLabel = reminderType.name;

    const vehicles = await this.prisma.vehicle.findMany({
      where: { customerId: { not: null } },
      include: {
        customer: true,
        reservations: {
          where: {
            status: { in: ['PENDING', 'CONFIRMED'] },
            scheduledStart: { gte: new Date() },
          },
        },
        serviceHistories: {
          where: { category: { has: categoryLabel }, voided: false },
          orderBy: { date: 'desc' },
        },
        reminderDismissals: {
          where: { reminderTypeId: reminderType.id },
        },
      },
    });

    const candidates: MaintenanceReminderCandidate[] = [];

    for (const vehicle of vehicles) {
      if (!vehicle.customer) continue;
      if (vehicle.reservations.length > 0) continue;

      const last = vehicle.serviceHistories[0];

      if (!last) continue; // まだ一度も記録が無い車両は目安が計算できないので対象外

      const dismissKey = `${last.date.toISOString()}|${last.mileage ?? ''}`;
      const dismissedFor = vehicle.reminderDismissals[0]?.dismissedFor;

      if (dismissedFor === dismissKey) continue;

      let due = false;

      if (intervalMonths) {
        const dueDate = new Date(last.date);
        dueDate.setMonth(dueDate.getMonth() + intervalMonths);
        due = daysUntil(dueDate) <= MAINTENANCE_REMINDER_WINDOW_DAYS;
      }

      if (!due) continue;

      const targetMileage =
        intervalKm && last.mileage != null ? last.mileage + intervalKm : null;

      const dueLabelParts = [`前回: ${last.date.toISOString().slice(0, 10)}`];

      if (targetMileage != null) {
        dueLabelParts.push(`目安走行距離: 約${targetMileage.toLocaleString()}km`);
      }

      let recommendElement: boolean | undefined;

      if (reminderType.name === 'オイル交換') {
        // 過去のオイル交換回数を数え、次回が2回に1回目(偶数回目)にあたる場合はエレメントも案内する
        // (走行距離の実測値が無いため回数ベースの簡易な目安として実装。今後調整可能)
        const pastOilChanges = await this.prisma.serviceHistory.count({
          where: { vehicleId: vehicle.id, category: { has: categoryLabel }, voided: false },
        });

        recommendElement = (pastOilChanges + 1) % 2 === 0;
      }

      candidates.push({
        vehicleId: vehicle.id,
        customerId: vehicle.customer.id,
        customerName: vehicle.customer.customerName,
        vehicleLabel:
          [vehicle.carName, vehicle.commonModelName].filter(Boolean).join(' ') || '車両',
        registrationNumber: vehicle.registrationNumber,
        dueLabel: dueLabelParts.join(' / '),
        recommendElement,
      });
    }

    return candidates;
  }

  /** 会社が設定した全リマインド種類分の候補を、種類ごとにまとめて返す */
  async getAllMaintenanceReminderCandidates(): Promise<
    { type: { id: number; name: string }; candidates: MaintenanceReminderCandidate[] }[]
  > {
    const types = await this.prisma.maintenanceReminderType.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    const results: { type: { id: number; name: string }; candidates: MaintenanceReminderCandidate[] }[] = [];

    for (const type of types) {
      const candidates = await this.getMaintenanceReminderCandidates(type);
      if (candidates.length > 0) {
        results.push({ type: { id: type.id, name: type.name }, candidates });
      }
    }

    return results;
  }

  /**
   * スタッフ向けの自由文(車検リマインド非表示)として解釈を試みる。
   * 該当が見つかり返信まで済んだ場合はtrue、該当が無く何も返信していない場合はfalseを返す
   * (falseの場合、呼び出し側がお客様向けの案内へフォールバックできるようにするため)
   */
  private async handleStaffFreeText(
    replyToken: string,
    staffLinks: StaffLinkWithCompany[],
    message: string,
  ): Promise<boolean> {
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
        return true;
      }
    }

    return false;
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
            link.companyAccount.displayName,
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

  /** 「予約確認」で使う。全連携先の今後の予約(未確定含む)を1通にまとめて返す */
  private async replyAggregatedReservationStatus(
    replyToken: string,
    links: LinkWithCompany[],
  ) {
    const sections: { companyAccountId: number; customerId: number; text: string }[] = [];

    for (const link of links) {
      const section = await this.withCompany(link.companyAccount, async () => {
        const customer = await this.customerService.findByLineUserId(link.lineUserId);

        if (!customer) return null;

        const reservations = await this.reservationService.findUpcomingForCustomer(customer.id);

        if (reservations.length === 0) return null;

        const lines: string[] = [`【${link.companyAccount.displayName}】`];

        for (const r of reservations) {
          const vehicleLabel = r.vehicle
            ? [r.vehicle.carName, r.vehicle.commonModelName].filter(Boolean).join(' ')
            : '';
          const statusLabel = r.status === 'CONFIRMED' ? '確定' : '未確定';
          const categoryLabel = r.category ? `[${r.category}] ` : '';

          lines.push(
            `${this.formatDateJst(r.scheduledStart)} ${categoryLabel}${vehicleLabel}（${statusLabel}）`,
          );
        }

        return { customerId: customer.id, text: lines.join('\n') };
      });

      if (section) {
        sections.push({ companyAccountId: link.companyAccountId, ...section });
      }
    }

    if (sections.length === 0) {
      await this.reply(replyToken, [
        {
          type: 'text',
          text: '現在、確認できるご予約はありません。',
          quickReply: mainMenuQuickReply,
        },
      ]);
      return;
    }

    const combinedText = '📅 ご予約状況\n\n' + sections.map((s) => s.text).join('\n\n');

    await this.reply(replyToken, [
      {
        type: 'text',
        text: combinedText,
        quickReply: mainMenuQuickReply,
      },
    ]);

    for (const section of sections) {
      const link = links.find((l) => l.companyAccountId === section.companyAccountId)!;

      await this.withCompany(link.companyAccount, async () => {
        await this.logMessage(section.customerId, 'OUT', section.text);
      });
    }
  }

  /** 新規の整備予約フローに直接入る(単一店舗なら即カテゴリ選択、複数店舗なら店舗選択から) */
  private async startNewReservationFlow(
    replyToken: string,
    lineUserId: string,
    links: LinkWithCompany[],
  ) {
    if (links.length === 1) {
      await this.promptReservationCategory(
        replyToken,
        lineUserId,
        links[0].companyAccount,
        true,
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
  }

  /**
   * 車検・オイル・タイヤの各リマインドのうち、指定した顧客本人に該当するものだけを
   * 案内文の配列にして返す。「お知らせ」「オススメメニュー」の両方から使う共通処理
   */
  private async buildReminderLines(customerId: number): Promise<string[]> {
    const limits = await this.licenseService.getCurrentPlanLimits();
    const predictiveMaintenanceEnabled = !limits || limits.predictiveMaintenance;

    const [shaken, maintenanceGroups] = await Promise.all([
      this.getShakenReminderCandidates(),
      predictiveMaintenanceEnabled
        ? this.getAllMaintenanceReminderCandidates()
        : Promise.resolve([]),
    ]);

    const lines: string[] = [];

    for (const c of shaken.filter((c) => c.customerId === customerId)) {
      lines.push(`🚗 車検: ${c.vehicleLabel}（車検満了: ${c.expirationDate}）`);
    }

    for (const group of maintenanceGroups) {
      const icon = MAINTENANCE_TYPE_ICON[group.type.name] ?? '🔧';

      for (const c of group.candidates.filter((c) => c.customerId === customerId)) {
        lines.push(
          `${icon} ${group.type.name}: ${c.vehicleLabel}（${c.dueLabel}）` +
            (c.recommendElement ? '\n　オイルエレメントの交換もおすすめです。' : ''),
        );
      }
    }

    return lines;
  }

  /**
   * 「お知らせ」タップ・「お知らせ」の自由文送信で、連携先各社の直近のお知らせと、
   * 本人の車検・オイル・タイヤ交換のリマインドをまとめてFlexカルーセルで返す
   */
  private async replyAnnouncements(
    replyToken: string,
    lineUserId: string,
    links: LinkWithCompany[],
  ) {
    const bubbles: messagingApi.FlexBubble[] = [];

    for (const link of links) {
      const { announcements, reminderLines } = await this.withCompany(
        link.companyAccount,
        async () => {
          const announcements = await this.announcementService.latest(3);
          const customer = await this.customerService.findByLineUserId(lineUserId);
          const reminderLines = customer ? await this.buildReminderLines(customer.id) : [];
          return { announcements, reminderLines };
        },
      );

      for (const a of announcements) {
        bubbles.push(
          this.buildAnnouncementBubble(
            a,
            link.companyAccount.displayName,
          ),
        );
      }

      if (reminderLines.length > 0) {
        bubbles.push(this.buildRecommendBubble(reminderLines, link.companyAccount.displayName));
      }
    }

    if (bubbles.length === 0) {
      await this.reply(replyToken, [
        { type: 'text', text: '現在お知らせはありません。', quickReply: mainMenuQuickReply },
      ]);
      return;
    }

    await this.reply(replyToken, [
      {
        type: 'flex',
        altText: 'お知らせ',
        contents:
          bubbles.length === 1 ? bubbles[0] : { type: 'carousel', contents: bubbles.slice(0, 10) },
      },
    ]);
  }

  private buildAnnouncementBubble(
    announcement: { title: string; body: string; createdAt: Date },
    shopLabel?: string,
  ): messagingApi.FlexBubble {
    return {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#1e3a5f',
        paddingAll: '12px',
        contents: [
          {
            type: 'text',
            text: shopLabel ? `📢 ${shopLabel}` : '📢 お知らせ',
            color: '#ffffff',
            weight: 'bold',
            size: 'sm',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          { type: 'text', text: announcement.title, weight: 'bold', size: 'md', wrap: true },
          { type: 'text', text: announcement.body, size: 'sm', color: '#666666', wrap: true },
          {
            type: 'text',
            text: announcement.createdAt.toISOString().slice(0, 10),
            size: 'xs',
            color: '#999999',
            margin: 'md',
          },
        ],
      },
    };
  }

  /**
   * 「オススメメニュー」タップ・「おすすめ」の自由文送信の返信に共通で添える案内。
   * 車関連のおすすめ(車検・オイル・タイヤの各リマインド)は本文側で案内されるため、
   * ここでは予約確認とポータルサイトへの導線を必ず添える
   */
  private buildRecommendMenuQuickReply(): messagingApi.QuickReply {
    return {
      items: [
        ...(mainMenuQuickReply.items ?? []),
        {
          type: 'action',
          action: {
            type: 'postback',
            label: '📋 予約確認',
            data: `action=${RESERVATION_ACTION_MAIN_CHOICE}&choice=CONFIRM`,
            displayText: '予約確認',
          },
        },
        buildPortalQuickReplyItem(),
      ],
    };
  }

  /** 「オススメメニュー」タップ・「おすすめ」の自由文送信で、車検・オイル・タイヤの各リマインドを本人分に絞ってまとめて案内する */
  private async replyRecommendMenu(
    replyToken: string,
    lineUserId: string,
    links: LinkWithCompany[],
  ) {
    const bubbles: messagingApi.FlexBubble[] = [];

    for (const link of links) {
      const bubble = await this.withCompany(link.companyAccount, async () => {
        const customer = await this.customerService.findByLineUserId(lineUserId);

        if (!customer) return null;

        const lines = await this.buildReminderLines(customer.id);

        if (lines.length === 0) return null;

        return this.buildRecommendBubble(
          lines,
          link.companyAccount.displayName,
        );
      });

      if (bubble) bubbles.push(bubble);
    }

    if (bubbles.length === 0) {
      await this.reply(replyToken, [
        {
          type: 'text',
          text: '現在おすすめのご案内はありません。',
          quickReply: this.buildRecommendMenuQuickReply(),
        },
      ]);
      return;
    }

    await this.reply(replyToken, [
      {
        type: 'flex',
        altText: 'オススメメニュー',
        contents:
          bubbles.length === 1 ? bubbles[0] : { type: 'carousel', contents: bubbles.slice(0, 10) },
        quickReply: this.buildRecommendMenuQuickReply(),
      },
    ]);
  }

  private buildRecommendBubble(lines: string[], shopLabel?: string): messagingApi.FlexBubble {
    return {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#b8860b',
        paddingAll: '12px',
        contents: [
          {
            type: 'text',
            text: shopLabel ? `✨ ${shopLabel} オススメ` : '✨ オススメメニュー',
            color: '#ffffff',
            weight: 'bold',
            size: 'sm',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: lines.map((text) => ({ type: 'text', text, size: 'sm', wrap: true })),
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#b8860b',
            action: {
              type: 'postback',
              label: '予約確認はこちら',
              data: `action=${RESERVATION_ACTION_MAIN_CHOICE}&choice=CONFIRM`,
              displayText: '予約確認',
            },
          },
        ],
      },
    };
  }

  private buildCompanyPickerQuickReply(
    links: LinkWithCompany[],
    action: string,
    extraParams?: string,
  ): messagingApi.QuickReply {
    return {
      items: links.slice(0, MAX_QUICK_REPLY_ITEMS).map((link) => ({
        type: 'action',
        action: {
          type: 'postback',
          label: link.companyAccount.displayName.slice(0, 20),
          data: `action=${action}&companyAccountId=${link.companyAccountId}${extraParams ?? ''}`,
          displayText: link.companyAccount.displayName,
        },
      })),
    };
  }

  /** 車検満了リマインドのプッシュ通知に添える「予約する」「通知を止める」ボタン */
  buildShakenReminderQuickReply(vehicleId: number, companyAccountId: number): messagingApi.QuickReply {
    return {
      items: [
        {
          type: 'action',
          action: {
            type: 'postback',
            label: '📅 予約する',
            data: `action=${SHAKEN_REMINDER_ACTION_RESERVE}&companyAccountId=${companyAccountId}&vehicleId=${vehicleId}`,
            displayText: '予約する',
          },
        },
        {
          type: 'action',
          action: {
            type: 'postback',
            label: '🔕 通知を止める',
            data: `action=${SHAKEN_REMINDER_ACTION_DISMISS}&companyAccountId=${companyAccountId}&vehicleId=${vehicleId}`,
            displayText: '通知を止める',
          },
        },
      ],
    };
  }

  /**
   * 2社以上と連携している場合、今応答している店舗以外への切り替えボタンをクイックリプライに添える。
   * 会話の自然な流れを保ちつつ、必要な時だけ店舗を切り替えられるようにするため
   */
  private withSwitchCompanyOptions(
    base: messagingApi.QuickReply,
    links: LinkWithCompany[],
    currentCompanyAccountId: number,
  ): messagingApi.QuickReply {
    const others = links.filter((l) => l.companyAccountId !== currentCompanyAccountId);

    if (others.length === 0) return base;

    const switchItems: messagingApi.QuickReplyItem[] = others.map((link) => ({
      type: 'action',
      action: {
        type: 'postback',
        label: `🏢 ${link.companyAccount.displayName}`.slice(0, 20),
        data: `action=${SWITCH_ACTION_PICK_COMPANY}&companyAccountId=${link.companyAccountId}`,
        displayText: `${link.companyAccount.displayName}に切り替え`,
      },
    }));

    return {
      items: [...(base.items ?? []), ...switchItems].slice(0, MAX_QUICK_REPLY_ITEMS),
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

    if (action === ANNOUNCEMENT_ACTION_SHOW) {
      const links = await this.findLinksForUser(lineUserId);

      if (links.length === 0) return;

      await this.replyAnnouncements(replyToken, lineUserId, links);
      return;
    }

    if (action === RECOMMEND_ACTION_SHOW) {
      const links = await this.findLinksForUser(lineUserId);

      if (links.length === 0) return;

      await this.replyRecommendMenu(replyToken, lineUserId, links);
      return;
    }

    if (action === RESERVATION_ACTION_MAIN_CHOICE) {
      const choice = params.get('choice');
      const links = await this.findLinksForUser(lineUserId);

      if (links.length === 0) return;

      if (choice === 'CONFIRM') {
        await this.replyAggregatedReservationStatus(replyToken, links);
        return;
      }

      await this.startNewReservationFlow(replyToken, lineUserId, links);
      return;
    }

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

    const showLabel = true;

    if (action === SWITCH_ACTION_PICK_COMPANY) {
      await this.touchCompanyLinkActivity(lineUserId, companyAccountId);

      await this.withCompany(company, async () => {
        const customer = await this.customerService.findByLineUserId(lineUserId);

        await this.reply(
          replyToken,
          [
            {
              type: 'text',
              text: `${company.displayName}に切り替えました。ご用件をどうぞ。`,
              quickReply: mainMenuQuickReply,
            },
          ],
          customer?.id,
          company.displayName,
        );
      });
      return;
    }

    if (action === IMAGE_ACTION_PICK_COMPANY) {
      const messageId = params.get('messageId');

      if (!messageId) return;

      await this.processVehicleImage(replyToken, lineUserId, company, messageId, showLabel);
      return;
    }

    if (action === SHAKEN_REMINDER_ACTION_RESERVE) {
      await this.promptReservationCategory(replyToken, lineUserId, company, showLabel);
      return;
    }

    if (action === SHAKEN_REMINDER_ACTION_DISMISS) {
      const vehicleIdStr = params.get('vehicleId');
      const vehicleId = vehicleIdStr ? Number(vehicleIdStr) : null;

      if (!vehicleId) return;

      await this.withCompany(company, async () => {
        const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
        if (!vehicle) return;

        await this.prisma.vehicle.update({
          where: { id: vehicleId },
          data: { shakenReminderDismissedFor: vehicle.expirationDate },
        });
      });

      await this.reply(replyToken, [
        {
          type: 'text',
          text: '車検満了のお知らせを停止しました。次の車検サイクルになりましたら、また改めてお知らせします。',
        },
      ]);
      return;
    }

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
      items: [
        ...RESERVATION_CATEGORIES.map((label) => ({
          type: 'action' as const,
          action: {
            type: 'postback' as const,
            label,
            data: `action=${RESERVATION_ACTION_PICK_CATEGORY}&companyAccountId=${companyAccountId}&category=${encodeURIComponent(label)}`,
            displayText: label,
          },
        })),
        {
          type: 'action' as const,
          action: {
            type: 'postback' as const,
            label: '📋 予約確認',
            data: `action=${RESERVATION_ACTION_MAIN_CHOICE}&choice=CONFIRM`,
            displayText: '予約確認',
          },
        },
      ],
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
      const limits = await this.licenseService.getCurrentPlanLimits();

      if (limits && !limits.webReservation) {
        await this.reply(replyToken, [
          {
            type: 'text',
            text: 'ただいまLINEでのご予約受付は行っておりません。恐れ入りますがお電話にてご予約ください。',
          },
        ]);
        return;
      }

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
    // エラー報告など、顧客・社員宛てではない運営者向けのシステム通知をpushMessageで
    // 送る場合にtrueを渡す。送信先IDがたまたま何らかの会社の顧客と一致していても、
    // その顧客とのやり取りとして誤ってログに残さないようにするため
    skipCustomerLog = false,
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

    // ログには【店舗名】プレフィックスを付ける前の元テキストを残す。付けた後のものを
    // 残すと、次のAI応答生成時にその会話履歴を読んだAIが「自分の過去の発言」を真似て
    // 自らプレフィックスを付けはじめ、そこにさらにこちら側のプレフィックスが重なって
    // 【店舗名】が二重に表示される不具合になる
    if (!skipCustomerLog && this.tenantContext.current()) {
      const customer = await this.customerService.findByLineUserId(lineUserId);

      if (customer) {
        await this.logOutgoing(customer.id, messages);
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

    // pushMessage()と同じ理由で、プレフィックス付け前の元テキストをログに残す
    if (customerId && this.tenantContext.current()) {
      await this.logOutgoing(customerId, messages);
    }
  }

  private async logOutgoing(customerId: number, messages: messagingApi.Message[]) {
    for (const m of messages) {
      if (m.type === 'text') {
        await this.logMessage(customerId, 'OUT', m.text);
      }
    }
  }

  private async logMessage(
    customerId: number,
    direction: 'IN' | 'OUT',
    text: string,
    lineOcrSubmissionId?: number,
  ) {
    const tenant = this.tenantContext.current();

    if (!tenant) return;

    try {
      await this.prisma.lineMessage.create({
        data: { customerId, direction, text, lineOcrSubmissionId },
      });
    } catch (err) {
      this.logger.error('Failed to log LINE message', err as Error);
    }

    // 「最後にやり取りのあった店舗」を判定できるよう、会社→顧客への送信のたびに更新する
    if (direction === 'OUT') {
      try {
        const customer = await this.prisma.customer.findUnique({
          where: { id: customerId },
          select: { lineUserId: true },
        });

        if (customer?.lineUserId) {
          await this.masterPrisma.lineCompanyLink.update({
            where: {
              lineUserId_companyAccountId: {
                lineUserId: customer.lineUserId,
                companyAccountId: tenant.company.id,
              },
            },
            data: { lastActiveAt: new Date() },
          });
        }
      } catch (err) {
        this.logger.warn(`LINE連携の最終活動日時更新に失敗しました: ${err}`);
      }
    }
  }
}
