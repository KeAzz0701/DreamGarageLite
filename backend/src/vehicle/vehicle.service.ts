import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VehicleService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

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