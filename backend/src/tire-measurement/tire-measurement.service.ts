// backend/src/tire-measurement/tire-measurement.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { groupAndEstimate } from '../common/tire-wear';

interface CreateTireMeasurementDto {
  date: string;
  position: string;
  tireType?: string;
  isNewTire?: boolean;
  treadDepthMm: number;
  mileage?: number;
  note?: string;
}

interface UpdateTireMeasurementDto {
  date?: string;
  position?: string;
  tireType?: string;
  isNewTire?: boolean;
  treadDepthMm?: number;
  mileage?: number;
  note?: string;
}

@Injectable()
export class TireMeasurementService {
  constructor(private readonly prisma: PrismaService) {}

  async create(vehicleId: number, data: CreateTireMeasurementDto) {
    return this.prisma.tireMeasurement.create({
      data: {
        vehicleId,
        date: new Date(data.date),
        position: data.position,
        tireType: data.tireType === 'WINTER' ? 'WINTER' : 'SUMMER',
        isNewTire: !!data.isNewTire,
        treadDepthMm: Number(data.treadDepthMm),
        mileage: data.mileage != null ? Number(data.mileage) : undefined,
        note: data.note || undefined,
      },
    });
  }

  async getByVehicle(vehicleId: number) {
    const measurements = await this.prisma.tireMeasurement.findMany({
      where: { vehicleId },
      orderBy: { date: 'desc' },
    });

    const estimates = groupAndEstimate(
      measurements.map((m) => ({
        position: m.position,
        tireType: m.tireType,
        date: m.date,
        treadDepthMm: m.treadDepthMm,
        mileage: m.mileage,
        isNewTire: m.isNewTire,
      })),
    );

    return { measurements, estimates };
  }

  /** 入力ミスの訂正用。金額を伴わない記録なので赤黒伝票化はせず、その場で上書き修正する */
  async update(id: number, data: UpdateTireMeasurementDto) {
    return this.prisma.tireMeasurement.update({
      where: { id },
      data: {
        date: data.date != null ? new Date(data.date) : undefined,
        position: data.position ?? undefined,
        tireType: data.tireType != null ? (data.tireType === 'WINTER' ? 'WINTER' : 'SUMMER') : undefined,
        isNewTire: data.isNewTire != null ? !!data.isNewTire : undefined,
        treadDepthMm: data.treadDepthMm != null ? Number(data.treadDepthMm) : undefined,
        mileage: data.mileage != null ? Number(data.mileage) : null,
        note: data.note || null,
      },
    });
  }

  async delete(id: number) {
    return this.prisma.tireMeasurement.delete({ where: { id } });
  }
}
