// backend/src/line/line.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { validateSignature, messagingApi, webhook } from '@line/bot-sdk';
import { CustomerService } from '../customer/customer.service';

const LINK_TOKEN_PATTERN = /^GK-[A-Z0-9]{6}$/;
const SERVICE_HISTORY_KEYWORD = '整備履歴';

const serviceHistoryQuickReply: messagingApi.QuickReply = {
  items: [
    {
      type: 'action',
      action: {
        type: 'message',
        label: '🔧 整備履歴を見る',
        text: SERVICE_HISTORY_KEYWORD,
      },
    },
  ],
};

@Injectable()
export class LineService {
  private readonly logger = new Logger(LineService.name);

  constructor(private readonly customerService: CustomerService) {}

  private readonly client = process.env.LINE_CHANNEL_ACCESS_TOKEN
    ? new messagingApi.MessagingApiClient({
        channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
      })
    : null;

  verifySignature(rawBody: Buffer, signature: string | undefined) {
    if (!signature) return false;

    return validateSignature(
      rawBody,
      process.env.LINE_CHANNEL_SECRET!,
      signature,
    );
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

    if (event.type === 'follow') {
      await this.reply(event.replyToken, [
        {
          type: 'text',
          text:
            'ガレージカルテの公式アカウントを友だち追加いただきありがとうございます。\n' +
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

      // replyTokenは有効期限が短く失効しやすいため、連携完了の通知はpushで確実に送る
      await this.pushMessage(lineUserId, [
        {
          type: 'text',
          text: `${customer.customerName}様、連携が完了しました。\n車検満了日などをこちらのLINEでお知らせします。`,
          quickReply: serviceHistoryQuickReply,
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

      await this.reply(replyToken, [
        {
          type: 'text',
          text: this.formatServiceHistoryReply(customer),
          quickReply: serviceHistoryQuickReply,
        },
      ]);
      return;
    }

    await this.reply(replyToken, [
      {
        type: 'text',
        text: `受信しました:「${text}」`,
        quickReply: serviceHistoryQuickReply,
      },
    ]);
  }

  /** 予約プッシュ通知等、返信トークンを使わずメッセージを送る */
  async pushMessage(lineUserId: string, messages: messagingApi.Message[]) {
    if (!this.client) {
      this.logger.warn(
        'LINE_CHANNEL_ACCESS_TOKEN未設定のため、プッシュ通知をスキップしました。',
      );
      return;
    }

    await this.client.pushMessage({ to: lineUserId, messages });
  }

  private async reply(
    replyToken: string,
    messages: messagingApi.Message[],
  ) {
    if (!this.client) {
      this.logger.warn(
        'LINE_CHANNEL_ACCESS_TOKEN未設定のため、返信をスキップしました。',
      );
      return;
    }

    await this.client.replyMessage({ replyToken, messages });
  }
}
