// backend/src/estimate/estimate.service.ts

import { BadRequestException, Injectable } from '@nestjs/common';
import { EstimateCategory, VehicleCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from '../gemini/gemini.service';
import { LicenseService } from '../license/license.service';
import { FeeRateService } from '../fee-rate/fee-rate.service';

interface EstimateItemDto {
  name: string;
  quantity?: number;
  unitPrice?: number;
  laborCost?: number;
  isFee?: boolean;
}

interface CreateEstimateDto {
  vehicleId?: number;
  customerId?: number;
  customerNameFreeText?: string;
  vehicleDescription?: string;
  title: string;
  category?: EstimateCategory;
  staffName?: string;
  items: EstimateItemDto[];
}

function buildItemsData(items: EstimateItemDto[]) {
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
export class EstimateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
    private readonly licenseService: LicenseService,
    private readonly feeRateService: FeeRateService,
  ) {}

  /** 車両詳細ページからの作成(vehicleId必須)。既存フォーム用 */
  async create(vehicleId: number, data: CreateEstimateDto) {
    return this.createEstimate({ ...data, vehicleId });
  }

  /** 車両を選ばない/選べない見積作成の入り口(ホーム画面「見積書作成」用) */
  async createStandalone(data: CreateEstimateDto) {
    if (!data.vehicleId && !data.customerId && !data.customerNameFreeText?.trim()) {
      throw new BadRequestException(
        '車両・顧客のいずれかを選ぶか、お客様名を入力してください。',
      );
    }

    return this.createEstimate(data);
  }

  /** 見積番号は会社(テナントDB)ごとに1から連番。idは削除等で欠番が出るため印字用途には使わない */
  private async nextEstimateNumber() {
    const agg = await this.prisma.estimate.aggregate({ _max: { estimateNumber: true } });
    return (agg._max.estimateNumber ?? 0) + 1;
  }

  private async createEstimate(data: CreateEstimateDto) {
    return this.prisma.estimate.create({
      data: {
        vehicleId: data.vehicleId ?? undefined,
        customerId: data.customerId ?? undefined,
        customerNameFreeText: data.customerNameFreeText?.trim() || undefined,
        vehicleDescription: data.vehicleDescription?.trim() || undefined,
        title: data.title,
        category: data.category ?? 'GENERAL',
        staffName: data.staffName,
        estimateNumber: await this.nextEstimateNumber(),
        items: {
          create: buildItemsData(data.items),
        },
      },
      include: {
        items: true,
        vehicle: { include: { customer: true } },
        customer: true,
      },
    });
  }

  /** 車検区分の見積を作る際、法定費用(AI概算)+お店の料金表から項目候補を組み立てる */
  async suggestShakenItems(
    vehicleId: number,
    vehicleCategory: VehicleCategory,
  ) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      throw new BadRequestException('Vehicle not found');
    }

    // クライアント自己申告のcompanyIdは信用せず、テナントDB内の会社から取得する
    const company = await this.prisma.company.findFirst();
    const apiKey = company
      ? await this.licenseService.getApiKey(company.id)
      : null;

    const legalFees = await this.geminiService.estimateLegalFees(
      vehicle,
      apiKey ?? undefined,
    );

    // 会社ごとに追加・削除・並び替えできる価格表(FeeRate)をそのまま項目として使う
    const shopRates = await this.feeRateService.getByCategory(vehicleCategory);

    const items = [
      { name: '自動車重量税', unitPrice: legalFees.weightTax, laborCost: 0, quantity: 1, isFee: true },
      { name: '自賠責保険料', unitPrice: legalFees.insuranceFee, laborCost: 0, quantity: 1, isFee: true },
      { name: '印紙代', unitPrice: legalFees.stampFee, laborCost: 0, quantity: 1, isFee: true },
      // お店の料金表(部品代・整備工賃)は法定費用ではなく整備項目として扱う。
      // 工賃区分(isLaborItem)の項目は技術料として、それ以外は部品代として反映する
      ...shopRates.map((r) => ({
        name: r.itemName,
        unitPrice: r.isLaborItem ? 0 : r.price,
        laborCost: r.isLaborItem ? r.price : 0,
        quantity: 1,
        isFee: false,
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
      include: {
        items: true,
        vehicle: { include: { customer: true } },
        customer: true,
      },
    });
  }

  /** 見積の内容をそのまま整備履歴(完了記録)に変換して保存する。車両未登録の見積は変換不可 */
  async convertToServiceHistory(id: number) {
    const estimate = await this.prisma.estimate.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!estimate) {
      throw new Error('Estimate not found');
    }

    if (!estimate.vehicleId) {
      throw new BadRequestException(
        '車両が未登録のため整備履歴に変換できません。車両を登録してから変換してください。',
      );
    }

    const documentNumberAgg = await this.prisma.serviceHistory.aggregate({
      _max: { documentNumber: true },
    });
    const documentNumber = (documentNumberAgg._max.documentNumber ?? 0) + 1;

    // 変換後は見積書側に残さない(整備履歴への昇格として扱う)
    const [serviceHistory] = await this.prisma.$transaction([
      this.prisma.serviceHistory.create({
        data: {
          vehicleId: estimate.vehicleId,
          documentNumber,
          date: new Date(),
          title: estimate.title,
          items: {
            create: estimate.items.map((i) => ({
              name: i.name,
              cost: i.cost,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              laborCost: i.laborCost,
              isFee: i.isFee,
            })),
          },
        },
        include: { items: true },
      }),
      this.prisma.estimate.delete({ where: { id } }),
    ]);

    return serviceHistory;
  }

  async delete(id: number) {
    return this.prisma.estimate.delete({
      where: { id },
    });
  }
}
