// backend/src/service-history/service-history.service.ts

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LineService } from '../line/line.service';

interface ServiceHistoryItemDto {
  name: string;
  cost: number;
  quantity?: number;
  unitPrice?: number;
  laborCost?: number;
  isFee?: boolean;
}

interface CreateServiceHistoryDto {
  date: string;
  title: string;
  mileage?: number;
  category?: string[];
  items: ServiceHistoryItemDto[];
}

interface CorrectServiceHistoryDto {
  title?: string;
  mileage?: number;
  category?: string[];
  items: ServiceHistoryItemDto[];
  visibleInPortal?: boolean;
}

function buildCorrectionItemsData(items: ServiceHistoryItemDto[]) {
  return (items ?? [])
    .filter((i) => i.name?.trim())
    .map((i) => {
      const quantity = Math.max(1, Number(i.quantity) || 1);
      const unitPrice = Number(i.unitPrice) || 0;
      const laborCost = Number(i.laborCost) || 0;

      return {
        name: i.name.trim(),
        quantity,
        unitPrice,
        laborCost,
        cost: quantity * unitPrice + laborCost,
        isFee: Boolean(i.isFee),
      };
    });
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
        mileage: data.mileage != null ? Number(data.mileage) : undefined,
        category: data.category ?? [],
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

  /** 確定済みの整備履歴を訂正する。元の行は赤伝(voided)として残し、訂正後の内容を黒伝として新規作成する */
  async correct(id: number, data: CorrectServiceHistoryDto) {
    const original = await this.prisma.serviceHistory.findUnique({
      where: { id },
    });

    if (!original) {
      throw new BadRequestException('対象の整備履歴が見つかりません。');
    }

    if (original.voided) {
      throw new BadRequestException('この整備履歴はすでに訂正済みです。');
    }

    const items = buildCorrectionItemsData(data.items);

    if (items.length === 0) {
      throw new BadRequestException('訂正後の項目を1件以上入力してください。');
    }

    const [, corrected] = await this.prisma.$transaction([
      this.prisma.serviceHistory.update({
        where: { id },
        data: { voided: true },
      }),
      this.prisma.serviceHistory.create({
        data: {
          vehicleId: original.vehicleId,
          date: original.date,
          title: data.title?.trim() || original.title,
          mileage: data.mileage != null ? Number(data.mileage) : original.mileage,
          category: data.category ?? original.category,
          correctedFromId: original.id,
          visibleInPortal: data.visibleInPortal ?? true,
          items: {
            create: items,
          },
        },
        include: {
          items: true,
          correctedFrom: { include: { items: true } },
        },
      }),
    ]);

    return corrected;
  }
}
