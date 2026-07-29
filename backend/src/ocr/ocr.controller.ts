// backend/src/ocr/ocr.controller.ts

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Logger,
  Param,
  ParseIntPipe,
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
import { LineService } from '../line/line.service';

@Controller('ocr')
@UseGuards(LicenseGuard)
export class OcrController {
  private readonly logger = new Logger(OcrController.name);

  constructor(
    private readonly geminiService: GeminiService,
    private readonly customerService: CustomerService,
    private readonly prisma: PrismaService,
    private readonly licenseService: LicenseService,
    private readonly lineService: LineService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'), LicenseInterceptor)
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

    // LINEで既に本人と分かっている顧客の場合は、OCR文字列のあいまい一致で
    // 別人の顧客が新規作成されるのを防ぐため、customerIdが渡されればそれを使う
    const customer = result.customerId
      ? await this.customerService.getById(Number(result.customerId))
      : await this.customerService.findOrCreate({
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

    if (!customer) {
      throw new BadRequestException('顧客が見つかりませんでした。');
    }

    const vehicleData = {
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
    };

    // vehicleIdが明示的に渡された場合は、その車両を直接更新する
    // (VINが読み取れなかった場合や、スタッフが既存車両への紐づけを選んだ場合)
    const vehicle = result.vehicleId
      ? await this.prisma.vehicle.update({
          where: { id: Number(result.vehicleId) },
          data: vehicleData,
        })
      : await this.prisma.vehicle.upsert({
          where: {
            vin: result.vin,
          },

          update: vehicleData,
          create: { vin: result.vin, ...vehicleData },
        });

    if (result.submissionId) {
      await this.prisma.lineOcrSubmission.update({
        where: { id: Number(result.submissionId) },
        data: {
          status: 'LINKED',
          linkedVehicleId: vehicle.id,
          reviewedAt: new Date(),
        },
      });
    }

    await this.notifyVehicleRegistered(customer, vehicle);

    return {
      success: true,
      customer,
      vehicle,
    };
  }

  /** 車両登録(OCR登録)完了時、LINE連携済みのお客様に一度だけ車検満了日+お礼のメッセージを送る */
  private async notifyVehicleRegistered(
    customer: { lineUserId: string | null },
    vehicle: {
      carName: string | null;
      commonModelName: string | null;
      registrationNumber: string | null;
      expirationDate: string | null;
    },
  ) {
    if (!customer.lineUserId) return;

    const vehicleLabel =
      [vehicle.carName, vehicle.commonModelName].filter(Boolean).join(' ') || '車両';
    const registrationLabel = vehicle.registrationNumber
      ? `（${vehicle.registrationNumber}）`
      : '';

    const text = vehicle.expirationDate
      ? `🚗 車両情報のご登録ありがとうございます。\n${vehicleLabel}${registrationLabel}\n車検満了日: ${vehicle.expirationDate}\n満了日が近づきましたら、こちらのLINEでお知らせいたします。`
      : `🚗 車両情報のご登録ありがとうございます。\n${vehicleLabel}${registrationLabel}`;

    try {
      await this.lineService.pushMessage(customer.lineUserId, [{ type: 'text', text }]);
    } catch (err) {
      this.logger.warn(`車両登録通知の送信に失敗しました: ${err}`);
    }
  }

  @Get('line-submissions')
  async listLineSubmissions() {
    return this.prisma.lineOcrSubmission.findMany({
      where: { status: 'PENDING' },
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('line-submissions/:id')
  async getLineSubmission(@Param('id', ParseIntPipe) id: number) {
    const submission = await this.prisma.lineOcrSubmission.findUnique({
      where: { id },
      include: { customer: { include: { vehicles: true } } },
    });

    if (!submission) return null;

    return {
      ...submission,
      imageData: undefined,
      imageBase64: Buffer.from(submission.imageData).toString('base64'),
    };
  }

  @Post('line-submissions/:id/dismiss')
  async dismissLineSubmission(@Param('id', ParseIntPipe) id: number) {
    return this.prisma.lineOcrSubmission.update({
      where: { id },
      data: { status: 'REJECTED', reviewedAt: new Date() },
    });
  }

}