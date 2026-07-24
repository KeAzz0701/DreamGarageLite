// backend/src/line/line.service.ts

import {
  Inject,
  Injectable,
  Logger,
  forwardRef,
} from '@nestjs/common';
import { validateSignature, messagingApi, webhook } from '@line/bot-sdk';
import { CustomerService } from '../customer/customer.service';
import { ReservationService } from '../reservation/reservation.service';
import { toJstDateOnly } from '../common/japanese-date';
import { TenantContextService } from '../tenant/tenant-context.service';
import { PrismaService } from '../prisma/prisma.service';

const LINK_TOKEN_PATTERN = /^GK-[A-Z0-9]{6}$/;
const SERVICE_HISTORY_KEYWORD = '整備履歴';
const RESERVATION_KEYWORD = '予約';
const RESERVATION_ACTION_PICK_DATE = 'reserve_pick_date';
const RESERVATION_ACTION_PICK_SLOT = 'reserve_pick_slot';
const MAX_QUICK_REPLY_ITEMS = 13;

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
  ) {}

  /** 会社ごとにMessagingApiClientをキャッシュする(companyAccountIdをキーに) */
  private readonly clients = new Map<number, messagingApi.MessagingApiClient>();

  private getClient(): messagingApi.MessagingApiClient | null {
    const company = this.tenantContext.current()?.company;

    if (!company?.lineChannelAccessToken) return null;

    const cached = this.clients.get(company.id);

    if (cached) return cached;

    const client = new messagingApi.MessagingApiClient({
      channelAccessToken: company.lineChannelAccessToken,
    });

    this.clients.set(company.id, client);

    return client;
  }

  /** Webhookの署名検証は、この時点で解決済みの会社のチャンネルシークレットを使う */
  verifySignature(rawBody: Buffer, signature: string | undefined) {
    const secret = this.tenantContext.current()?.company.lineChannelSecret;

    if (!signature || !secret) return false;

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
            'お店で発行された連携コード(GK-から始まる文字列)をこのトークに送信すると、お車の情報と連携されます。',
        },
      ]);
    }
  }

  private formatServiceHistoryReply(customer: {
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
  }): string {
    const lines: string[] = [`🚗 ${customer.customerName}様の整備履歴`];

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
        const total = sh.items.reduce((s, i) => s + i.cost, 0);
        const dateStr = sh.date.toISOString().slice(0, 10);

        lines.push(`${dateStr} ${sh.title}（¥${total.toLocaleString()}）`);
      }
    }

    if (!hasAny) {
      lines.push('\nまだ整備履歴の記録がありません。');
    }

    return lines.join('\n');
  }

  private async handleTextMessage(
    replyToken: string,
    lineUserId: string | undefined,
    text: string,
  ) {
    const token = text.trim().toUpperCase();

    const knownCustomer = lineUserId
      ? await this.customerService.findByLineUserId(lineUserId)
      : null;

    if (knownCustomer) {
      await this.logMessage(knownCustomer.id, 'IN', text);
    }

    if (lineUserId && LINK_TOKEN_PATTERN.test(token)) {
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
      await this.logMessage(customer.id, 'IN', text);

      // replyTokenは有効期限が短く失効しやすいため、連携完了の通知はpushで確実に送る
      await this.pushMessage(lineUserId, [
        {
          type: 'text',
          text: `${customer.customerName}様、連携が完了しました。\n車検満了日などをこちらのLINEでお知らせします。`,
          quickReply: mainMenuQuickReply,
        },
      ]);
      return;
    }

    if (text.trim() === SERVICE_HISTORY_KEYWORD) {
      if (!lineUserId) return;

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
            text: this.formatServiceHistoryReply(customer),
            quickReply: mainMenuQuickReply,
          },
        ],
        customer.id,
      );
      return;
    }

    if (text.trim() === RESERVATION_KEYWORD) {
      if (!lineUserId) return;

      const customer = await this.findLinkedCustomerOrPrompt(
        replyToken,
        lineUserId,
      );

      if (!customer) return;

      const { min, max } = await this.reservationService.getBookableRange();

      await this.reply(
        replyToken,
        [
          {
            type: 'text',
            text: 'ご希望の来店日をお選びください。',
            quickReply: this.buildDatePickerQuickReply(min, max),
          },
        ],
        customer.id,
      );
      return;
    }

    await this.reply(
      replyToken,
      [
        {
          type: 'text',
          text: `受信しました:「${text}」`,
          quickReply: mainMenuQuickReply,
        },
      ],
      knownCustomer?.id,
    );
  }

  private async handlePostback(
    replyToken: string | undefined,
    lineUserId: string | undefined,
    postback: webhook.PostbackContent,
  ) {
    if (!replyToken || !lineUserId) return;

    const params = new URLSearchParams(postback.data);
    const action = params.get('action');

    if (action === RESERVATION_ACTION_PICK_DATE) {
      const date = postback.params?.date;

      if (!date) return;

      await this.replyOpenSlots(replyToken, lineUserId, date);
      return;
    }

    if (action === RESERVATION_ACTION_PICK_SLOT) {
      const start = params.get('start');

      if (!start) return;

      await this.confirmSlotSelection(replyToken, lineUserId, start);
      return;
    }
  }

  private async findLinkedCustomerOrPrompt(
    replyToken: string,
    lineUserId: string,
  ) {
    const customer = await this.customerService.findByLineUserId(lineUserId);

    if (!customer) {
      await this.reply(replyToken, [
        {
          type: 'text',
          text: 'まだ連携が完了していません。お店で発行された連携コードを送信してください。',
        },
      ]);
      return null;
    }

    return customer;
  }

  private buildDatePickerQuickReply(min: Date, max: Date): messagingApi.QuickReply {
    return {
      items: [
        {
          type: 'action',
          action: {
            type: 'datetimepicker',
            label: '📅 日付を選択',
            data: `action=${RESERVATION_ACTION_PICK_DATE}`,
            mode: 'date',
            min: toJstDateOnly(min),
            max: toJstDateOnly(max),
          },
        },
      ],
    };
  }

  private async replyOpenSlots(
    replyToken: string,
    lineUserId: string,
    dateStr: string,
  ) {
    const customer = await this.findLinkedCustomerOrPrompt(
      replyToken,
      lineUserId,
    );

    if (!customer) return;

    const slots = await this.reservationService.getOpenSlots(dateStr);

    const { min, max } = await this.reservationService.getBookableRange();

    if (slots.length === 0) {
      await this.reply(
        replyToken,
        [
          {
            type: 'text',
            text: 'その日は空きがありません。別の日をお選びください。',
            quickReply: this.buildDatePickerQuickReply(min, max),
          },
        ],
        customer.id,
      );
      return;
    }

    await this.reply(
      replyToken,
      [
        {
          type: 'text',
          text: `${dateStr} の空き時間からお選びください。`,
          quickReply: {
            items: slots.slice(0, MAX_QUICK_REPLY_ITEMS).map((slot) => ({
              type: 'action',
              action: {
                type: 'postback',
                label: slot.label,
                data: `action=${RESERVATION_ACTION_PICK_SLOT}&start=${encodeURIComponent(slot.start.toISOString())}`,
                displayText: `${dateStr} ${slot.label}`,
              },
            })),
          },
        },
      ],
      customer.id,
    );
  }

  private async confirmSlotSelection(
    replyToken: string,
    lineUserId: string,
    startIso: string,
  ) {
    const customer = await this.findLinkedCustomerOrPrompt(
      replyToken,
      lineUserId,
    );

    if (!customer) return;

    try {
      const reservation = await this.reservationService.createFromLineRequest(
        customer.id,
        new Date(startIso),
      );

      await this.reply(
        replyToken,
        [
          {
            type: 'text',
            text:
              `ご希望を受け付けました。\n` +
              `${this.formatDateJst(reservation.scheduledStart)}\n` +
              `店舗からの確定連絡をお待ちください。`,
            quickReply: mainMenuQuickReply,
          },
        ],
        customer.id,
      );
    } catch (err: any) {
      const { min, max } = await this.reservationService.getBookableRange();

      await this.reply(
        replyToken,
        [
          {
            type: 'text',
            text: `${err?.message ?? 'ご希望の時間帯では予約できませんでした。'}\n別の日時をお選びください。`,
            quickReply: this.buildDatePickerQuickReply(min, max),
          },
        ],
        customer.id,
      );
    }
  }

  private formatDateJst(date: Date) {
    const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    const [datePart, timePart] = jst.toISOString().slice(0, 16).split('T');
    return `${datePart} ${timePart}`;
  }

  /** 予約プッシュ通知等、返信トークンを使わずメッセージを送る */
  async pushMessage(lineUserId: string, messages: messagingApi.Message[]) {
    const client = this.getClient();

    if (!client) {
      this.logger.warn(
        'LINEチャンネルが未設定のため、プッシュ通知をスキップしました。',
      );
      return;
    }

    await client.pushMessage({ to: lineUserId, messages });

    const customer = await this.customerService.findByLineUserId(lineUserId);

    if (customer) {
      await this.logOutgoing(customer.id, messages);
    }
  }

  private async reply(
    replyToken: string,
    messages: messagingApi.Message[],
    customerId?: number,
  ) {
    const client = this.getClient();

    if (!client) {
      this.logger.warn(
        'LINEチャンネルが未設定のため、返信をスキップしました。',
      );
      return;
    }

    await client.replyMessage({ replyToken, messages });

    if (customerId) {
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

  private async logMessage(customerId: number, direction: 'IN' | 'OUT', text: string) {
    try {
      await this.prisma.lineMessage.create({ data: { customerId, direction, text } });
    } catch (err) {
      this.logger.error('Failed to log LINE message', err as Error);
    }
  }
}
