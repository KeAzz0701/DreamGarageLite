// backend/src/service-history/service-history.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LineService } from '../line/line.service';

interface ServiceHistoryItemDto {
  name: string;
  cost: number;
}

interface CreateServiceHistoryDto {
  date: string;
  title: string;
  items: ServiceHistoryItemDto[];
}

@Injectable()
export class ServiceHistoryService {
  private readonly logger = new Logger(ServiceHistoryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly lineService: LineService,
  ) {}

  async create(vehicleId: number, data: CreateServiceHistoryDto) {
    const serviceHistory = await this.prisma.serviceHistory.create({
      data: {
        vehicleId,
        date: new Date(data.date),
        title: data.title,
        items: {
          create: (data.items ?? [])
            .filter((i) => i.name?.trim())
            .map((i) => ({
              name: i.name.trim(),
              cost: Number(i.cost) || 0,
            })),
        },
      },
      include: {
        items: true,
        vehicle: { include: { customer: true } },
      },
    });

    await this.notifyCompletion(serviceHistory);

    return serviceHistory;
  }

  /** LINE送信失敗が整備記録の登録自体を壊さないよう握りつぶす */
  private async notifyCompletion(serviceHistory: {
    title: string;
    items: { name: string; cost: number }[];
    vehicle: {
      carName: string | null;
      commonModelName: string | null;
      registrationNumber: string | null;
      customer: { lineUserId: string | null } | null;
    } | null;
  }) {
    const lineUserId = serviceHistory.vehicle?.customer?.lineUserId;

    if (!lineUserId) return;

    const vehicleName = [
      serviceHistory.vehicle?.carName,
      serviceHistory.vehicle?.commonModelName,
    ]
      .filter(Boolean)
      .join(' ');

    const total = serviceHistory.items.reduce((s, i) => s + i.cost, 0);

    try {
      await this.lineService.pushMessage(lineUserId, [
        {
          type: 'text',
          text:
            `🔧 整備が完了しました\n` +
            `${vehicleName || '車両'}（${serviceHistory.vehicle?.registrationNumber ?? '登録番号未登録'}）\n` +
            `${serviceHistory.title}（¥${total.toLocaleString()}）\n` +
            `詳しい内容は「整備履歴」とお送りいただくとご確認いただけます。`,
        },
      ]);
    } catch (err) {
      this.logger.warn(`整備完了通知の送信に失敗しました: ${err}`);
    }
  }

  async getByVehicle(vehicleId: number) {
    return this.prisma.serviceHistory.findMany({
      where: { vehicleId },
      include: { items: true },
      orderBy: { date: 'desc' },
    });
  }

  async delete(id: number) {
    return this.prisma.serviceHistory.delete({
      where: { id },
    });
  }
}
