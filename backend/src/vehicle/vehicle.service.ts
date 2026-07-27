import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LineService } from '../line/line.service';

@Injectable()
export class VehicleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lineService: LineService,
  ) {}

  /** ホーム画面の車検リマインド一覧・通知バッジ件数に使う(無料版含む全プラン共通) */
  async getShakenReminders() {
    return this.lineService.getShakenReminderCandidates();
  }

  /**
   * 車検リマインドを非表示にする。理由(他社入庫等)を任意で記録できる。
   * expirationDateが変われば(=次の車検サイクルになれば)自動的にまた表示される。
   */
  async dismissShakenReminder(id: number, reason?: string) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id } });

    if (!vehicle) {
      throw new BadRequestException('対象の車両が見つかりませんでした。');
    }

    return this.prisma.vehicle.update({
      where: { id },
      data: {
        shakenReminderDismissedFor: vehicle.expirationDate,
        shakenReminderDismissReason: reason?.trim() || null,
      },
    });
  }

  async getAll() {
    return this.prisma.vehicle.findMany({
      include: {
        customer: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async getById(id: number) {
    return this.prisma.vehicle.findUnique({
      where: {
        id,
      },
      include: {
        customer: true,
        serviceHistories: {
          include: { items: true },
          orderBy: { date: 'desc' },
        },
        tireMeasurements: {
          orderBy: { date: 'desc' },
        },
      },
    });
  }

  async getByVin(vin: string) {
    return this.prisma.vehicle.findUnique({
      where: {
        vin,
      },
      include: {
        customer: true,
      },
    });
  }

  async delete(id: number) {
    return this.prisma.vehicle.delete({
      where: {
        id,
      },
    });
  }

  async update(id: number, data: any) {
    return this.prisma.vehicle.update({
      where: {
        id,
      },
      data: {
        registrationNumber: data.registrationNumber,
        ownerName: data.ownerName,
        ownerAddress: data.ownerAddress,
        userName: data.userName,
        userAddress: data.userAddress,
        usageBase: data.usageBase,
        carName: data.carName,
        commonModelName: data.commonModelName,
        model: data.model,
        engineModel: data.engineModel,
        modelCode: data.modelCode,
        classificationCode: data.classificationCode,
        firstRegistration: data.firstRegistration,
        expirationDate: data.expirationDate,
        vehicleWeight: data.vehicleWeight,
        grossWeight: data.grossWeight,
        seatingCapacity: data.seatingCapacity,
        maxLoad: data.maxLoad,
        length: data.length,
        width: data.width,
        height: data.height,
        displacement: data.displacement,
        fuel: data.fuel,
        usage: data.usage,
        privateBusiness: data.privateBusiness,
        bodyType: data.bodyType,
        remarks: data.remarks,
      },
      include: {
        customer: true,
      },
    });
  }
}