// backend/src/ocr/ocr.controller.ts

import {
  Body,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { GeminiService } from '../gemini/gemini.service';
import { CustomerService } from '../customer/customer.service';
import { PrismaService } from '../prisma/prisma.service';

import { LicenseGuard } from '../license/license.guard';
import { LicenseInterceptor } from '../license/license.interceptor';
import { LicenseService } from '../license/license.service';

@Controller('ocr')
@UseGuards(LicenseGuard)
@UseInterceptors(LicenseInterceptor)
export class OcrController {
  constructor(
    private readonly geminiService: GeminiService,
    private readonly customerService: CustomerService,
    private readonly prisma: PrismaService,
    private readonly licenseService: LicenseService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    const base64 = file.buffer.toString('base64');

    const apiKey = await this.licenseService.getApiKey(
      req.companyId,
    );

    const text = await this.geminiService.analyzeImage(
      base64,
      file.mimetype,
      apiKey ?? undefined,
    );

    return JSON.parse(text);
  }

  @Post('register')
  async register(@Body() result: any) {
    const invalidUsers = [
      '',
      '***',
      '****',
      '*****',
      '-',
      '--',
      'ー',
      'ーー',
      '不明',
    ];

    const useUser =
      result.userName &&
      !invalidUsers.includes(
        String(result.userName).trim(),
      );

    const customer = await this.customerService.findOrCreate({
      customerName: useUser
        ? result.userName
        : result.ownerName,

      customerAddress: useUser
        ? result.userAddress
        : result.ownerAddress,

      ownerName: result.ownerName ?? '',
      ownerAddress: result.ownerAddress ?? '',
      phone: result.phone ?? '',
    });

    const vehicle = await this.prisma.vehicle.upsert({
      where: {
        vin: result.vin,
      },

      update: {
        customerId: customer.id,

        registrationNumber: result.registrationNumber ?? '',
        ownerName: result.ownerName ?? '',
        ownerAddress: result.ownerAddress ?? '',
        userName: result.userName ?? '',
        userAddress: result.userAddress ?? '',
        usageBase: result.usageBase ?? '',
        carName: result.carName ?? '',
        commonModelName: result.commonModelName ?? '',
        model: result.model ?? '',
        engineModel: result.engineModel ?? '',
        modelCode: result.modelCode ?? '',
        classificationCode: result.classificationCode ?? '',
        firstRegistration: result.firstRegistration ?? '',
        expirationDate: result.expirationDate ?? '',
        vehicleWeight: result.vehicleWeight ?? '',
        grossWeight: result.grossWeight ?? '',
        seatingCapacity: result.seatingCapacity ?? '',
        maxLoad: result.maxLoad ?? '',
        length: result.length ?? '',
        width: result.width ?? '',
        height: result.height ?? '',
        displacement: result.displacement ?? '',
        fuel: result.fuel ?? '',
        usage: result.usage ?? '',
        privateBusiness: result.privateBusiness ?? '',
        bodyType: result.bodyType ?? '',
        remarks: result.remarks ?? '',
      },

      create: {
        vin: result.vin,

        customerId: customer.id,

        registrationNumber: result.registrationNumber ?? '',
        ownerName: result.ownerName ?? '',
        ownerAddress: result.ownerAddress ?? '',
        userName: result.userName ?? '',
        userAddress: result.userAddress ?? '',
        usageBase: result.usageBase ?? '',
        carName: result.carName ?? '',
        commonModelName: result.commonModelName ?? '',
        model: result.model ?? '',
        engineModel: result.engineModel ?? '',
        modelCode: result.modelCode ?? '',
        classificationCode: result.classificationCode ?? '',
        firstRegistration: result.firstRegistration ?? '',
        expirationDate: result.expirationDate ?? '',
        vehicleWeight: result.vehicleWeight ?? '',
        grossWeight: result.grossWeight ?? '',
        seatingCapacity: result.seatingCapacity ?? '',
        maxLoad: result.maxLoad ?? '',
        length: result.length ?? '',
        width: result.width ?? '',
        height: result.height ?? '',
        displacement: result.displacement ?? '',
        fuel: result.fuel ?? '',
        usage: result.usage ?? '',
        privateBusiness: result.privateBusiness ?? '',
        bodyType: result.bodyType ?? '',
        remarks: result.remarks ?? '',
      },
    });

    return {
      success: true,
      customer,
      vehicle,
    };
  }
}