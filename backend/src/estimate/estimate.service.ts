// backend/src/estimate/estimate.service.ts

import { BadRequestException, Injectable } from '@nestjs/common';
import { VehicleCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from '../gemini/gemini.service';
import { LicenseService } from '../license/license.service';
import { FeeRateService, SHOP_SHAKEN_ITEMS } from '../fee-rate/fee-rate.service';

interface EstimateItemDto {
  name: string;
  cost: number;
}

interface CreateEstimateDto {
  title: string;
  category?: 'SHAKEN' | 'GENERAL';
  staffName?: string;
  items: EstimateItemDto[];
}

@Injectable()
export class EstimateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
    private readonly licenseService: LicenseService,
    private readonly feeRateService: FeeRateService,
  ) {}

  async create(vehicleId: number, data: CreateEstimateDto) {
    return this.prisma.estimate.create({
      data: {
        vehicleId,
        title: data.title,
        category: data.category ?? 'GENERAL',
        staffName: data.staffName,
        items: {
          create: (data.items ?? [])
            .filter((i) => i.name?.trim())
            .map((i) => ({
              name: i.name.trim(),
              cost: Number(i.cost) || 0,
            })),
        },
      },
      include: { items: true, vehicle: { include: { customer: true } } },
    });
  }

  /** 車検区分の見積を作る際、法定費用(AI概算)+お店の料金表から項目候補を組み立てる */
  async suggestShakenItems(
    vehicleId: number,
    vehicleCategory: VehicleCategory,
    companyId: number,
  ) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      throw new BadRequestException('Vehicle not found');
    }

    const apiKey = await this.licenseService.getApiKey(companyId);

    const legalFees = await this.geminiService.estimateLegalFees(
      vehicle,
      apiKey ?? undefined,
    );

    const shopRates = await this.feeRateService.getByCategory(vehicleCategory);
    const rateMap = new Map(shopRates.map((r) => [r.itemName, r.price]));

    const items = [
      { name: '自動車重量税', cost: legalFees.weightTax },
      { name: '自賠責保険料', cost: legalFees.insuranceFee },
      { name: '印紙代', cost: legalFees.stampFee },
      ...SHOP_SHAKEN_ITEMS.map((name) => ({
        name,
        cost: rateMap.get(name) ?? 0,
      })),
    ];

    return { items, note: legalFees.note };
  }

  async getByVehicle(vehicleId: number) {
    return this.prisma.estimate.findMany({
      where: { vehicleId },
      include: { items: true },
      orderBy: { date: 'desc' },
    });
  }

  async getById(id: number) {
    return this.prisma.estimate.findUnique({
      where: { id },
      include: { items: true, vehicle: { include: { customer: true } } },
    });
  }

  /** 見積の内容をそのまま整備履歴(完了記録)に変換して保存する */
  async convertToServiceHistory(id: number) {
    const estimate = await this.prisma.estimate.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!estimate) {
      throw new Error('Estimate not found');
    }

    return this.prisma.serviceHistory.create({
      data: {
        vehicleId: estimate.vehicleId,
        date: new Date(),
        title: estimate.title,
        items: {
          create: estimate.items.map((i) => ({
            name: i.name,
            cost: i.cost,
          })),
        },
      },
      include: { items: true },
    });
  }

  async delete(id: number) {
    return this.prisma.estimate.delete({
      where: { id },
    });
  }
}
