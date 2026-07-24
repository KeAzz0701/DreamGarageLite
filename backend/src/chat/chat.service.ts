// backend/src/chat/chat.service.ts

import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from '../gemini/gemini.service';
import { LicenseService } from '../license/license.service';

const HISTORY_TURNS = 20;

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
    private readonly licenseService: LicenseService,
  ) {}

  async listMessages() {
    return this.prisma.chatMessage.findMany({
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
  }

  async sendMessage(message: string) {
    if (!message?.trim()) {
      throw new BadRequestException('message is required');
    }

    const history = await this.prisma.chatMessage.findMany({
      orderBy: { createdAt: 'desc' },
      take: HISTORY_TURNS,
    });

    const context = await this.buildContext(message);

    const company = await this.prisma.company.findFirst();
    const apiKey = company
      ? await this.licenseService.getApiKey(company.id)
      : null;

    const reply = await this.geminiService.chat(
      history
        .slice()
        .reverse()
        .map((h) => ({ role: h.role as 'user' | 'model', content: h.content })),
      message,
      context,
      apiKey ?? undefined,
    );

    const [userMessage, assistantMessage] = await this.prisma.$transaction([
      this.prisma.chatMessage.create({ data: { role: 'user', content: message } }),
      this.prisma.chatMessage.create({ data: { role: 'model', content: reply } }),
    ]);

    return { userMessage, assistantMessage };
  }

  /** 当日の予約・顧客一覧・(発言に名前が含まれる場合は)その顧客の整備履歴を組み立てる */
  private async buildContext(message: string): Promise<string> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaysReservations = await this.prisma.reservation.findMany({
      where: {
        status: { in: ['PENDING', 'CONFIRMED'] },
        scheduledStart: { gte: today, lt: tomorrow },
      },
      include: { customer: true },
      orderBy: { scheduledStart: 'asc' },
    });

    const customers = await this.prisma.customer.findMany({
      select: { id: true, customerName: true },
      take: 300,
    });

    const lines: string[] = [];

    lines.push(`本日の日付: ${today.toISOString().slice(0, 10)}`);

    if (todaysReservations.length === 0) {
      lines.push('本日の予約: なし');
    } else {
      lines.push('本日の予約:');

      for (const r of todaysReservations) {
        const jst = new Date(r.scheduledStart.getTime() + 9 * 60 * 60 * 1000);
        const time = jst.toISOString().slice(11, 16);
        const statusLabel = r.status === 'CONFIRMED' ? '確定' : '未確定';

        lines.push(`- ${time} ${r.customer?.customerName ?? '不明'}様（${statusLabel}）`);
      }
    }

    lines.push(
      `登録顧客一覧(${customers.length}件、名前のみ): ${customers.map((c) => c.customerName).join('、') || 'なし'}`,
    );

    const matched = customers.find((c) => message.includes(c.customerName));

    if (matched) {
      const detail = await this.prisma.customer.findUnique({
        where: { id: matched.id },
        include: {
          vehicles: {
            include: {
              serviceHistories: {
                include: { items: true },
                orderBy: { date: 'desc' },
                take: 5,
              },
            },
          },
        },
      });

      if (detail) {
        lines.push(`--- ${detail.customerName}様の詳細 ---`);

        for (const v of detail.vehicles) {
          lines.push(
            `車両: ${v.carName ?? ''} ${v.commonModelName ?? ''}（${v.registrationNumber ?? '登録番号未登録'}）`,
          );

          for (const sh of v.serviceHistories) {
            const total = sh.items.reduce((s, i) => s + i.cost, 0);
            lines.push(
              `  - ${sh.date.toISOString().slice(0, 10)} ${sh.title} ¥${total.toLocaleString()}`,
            );
          }
        }
      }
    }

    return lines.join('\n');
  }
}
