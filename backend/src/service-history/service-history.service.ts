// backend/src/service-history/service-history.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
  constructor(private readonly prisma: PrismaService) {}

  async create(vehicleId: number, data: CreateServiceHistoryDto) {
    return this.prisma.serviceHistory.create({
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
      include: { items: true },
    });
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
