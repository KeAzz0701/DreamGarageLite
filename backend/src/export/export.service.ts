// backend/src/export/export.service.ts

import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

  async buildWorkbook(): Promise<ExcelJS.Buffer> {
    const workbook = new ExcelJS.Workbook();

    const customers = await this.prisma.customer.findMany({
      orderBy: { customerName: 'asc' },
    });

    const vehicles = await this.prisma.vehicle.findMany({
      include: { customer: true },
      orderBy: { updatedAt: 'desc' },
    });

    const serviceHistories = await this.prisma.serviceHistory.findMany({
      include: { items: true, vehicle: true },
      orderBy: { date: 'desc' },
    });

    const customerSheet = workbook.addWorksheet('顧客');
    customerSheet.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: '顧客名', key: 'customerName', width: 20 },
      { header: '住所', key: 'customerAddress', width: 40 },
      { header: '電話番号', key: 'phone', width: 16 },
      { header: 'LINE連携', key: 'line', width: 10 },
      { header: '登録日', key: 'createdAt', width: 14 },
    ];
    customers.forEach((c) => {
      customerSheet.addRow({
        id: c.id,
        customerName: c.customerName,
        customerAddress: c.customerAddress,
        phone: c.phone,
        line: c.lineUserId ? '連携済み' : '未連携',
        createdAt: c.createdAt.toISOString().slice(0, 10),
      });
    });

    const vehicleSheet = workbook.addWorksheet('車両');
    vehicleSheet.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: '顧客ID', key: 'customerId', width: 10 },
      { header: '所有者', key: 'customerName', width: 20 },

      // 基本情報
      { header: '登録番号', key: 'registrationNumber', width: 18 },
      { header: '車台番号', key: 'vin', width: 20 },
      { header: '車名', key: 'carName', width: 12 },
      { header: '車種名', key: 'commonModelName', width: 12 },
      { header: '型式', key: 'model', width: 16 },
      { header: '原動機の型式', key: 'engineModel', width: 14 },
      { header: '型式指定番号', key: 'modelCode', width: 14 },
      { header: '類別区分番号', key: 'classificationCode', width: 14 },

      // 所有者・使用者
      { header: '車検証記載:所有者', key: 'ownerName', width: 16 },
      { header: '車検証記載:所有者住所', key: 'ownerAddress', width: 30 },
      { header: '車検証記載:使用者', key: 'userName', width: 16 },
      { header: '車検証記載:使用者住所', key: 'userAddress', width: 30 },
      { header: '使用の本拠の位置', key: 'usageBase', width: 30 },

      // 登録・有効期限
      { header: '初度登録年月', key: 'firstRegistration', width: 14 },
      { header: '車検有効期限', key: 'expirationDate', width: 16 },

      // 諸元
      { header: '車両重量', key: 'vehicleWeight', width: 10 },
      { header: '車両総重量', key: 'grossWeight', width: 10 },
      { header: '乗車定員', key: 'seatingCapacity', width: 10 },
      { header: '最大積載量', key: 'maxLoad', width: 10 },
      { header: '長さ(mm)', key: 'length', width: 10 },
      { header: '幅(mm)', key: 'width', width: 10 },
      { header: '高さ(mm)', key: 'height', width: 10 },
      { header: '総排気量', key: 'displacement', width: 10 },
      { header: '燃料の種類', key: 'fuel', width: 10 },

      // その他
      { header: '用途', key: 'usage', width: 10 },
      { header: '自家用・事業用', key: 'privateBusiness', width: 12 },
      { header: '車体の形状', key: 'bodyType', width: 12 },
      { header: '備考', key: 'remarks', width: 50 },

      { header: '登録日', key: 'createdAt', width: 14 },
      { header: '更新日', key: 'updatedAt', width: 14 },
    ];
    vehicles.forEach((v) => {
      vehicleSheet.addRow({
        id: v.id,
        customerId: v.customerId ?? '',
        customerName: v.customer?.customerName ?? '',

        registrationNumber: v.registrationNumber,
        vin: v.vin,
        carName: v.carName,
        commonModelName: v.commonModelName,
        model: v.model,
        engineModel: v.engineModel,
        modelCode: v.modelCode,
        classificationCode: v.classificationCode,

        ownerName: v.ownerName,
        ownerAddress: v.ownerAddress,
        userName: v.userName,
        userAddress: v.userAddress,
        usageBase: v.usageBase,

        firstRegistration: v.firstRegistration,
        expirationDate: v.expirationDate,

        vehicleWeight: v.vehicleWeight,
        grossWeight: v.grossWeight,
        seatingCapacity: v.seatingCapacity,
        maxLoad: v.maxLoad,
        length: v.length,
        width: v.width,
        height: v.height,
        displacement: v.displacement,
        fuel: v.fuel,

        usage: v.usage,
        privateBusiness: v.privateBusiness,
        bodyType: v.bodyType,
        remarks: v.remarks,

        createdAt: v.createdAt.toISOString().slice(0, 10),
        updatedAt: v.updatedAt.toISOString().slice(0, 10),
      });
    });

    const historySheet = workbook.addWorksheet('整備履歴');
    historySheet.columns = [
      { header: '日付', key: 'date', width: 14 },
      { header: '登録番号', key: 'registrationNumber', width: 18 },
      { header: '車名', key: 'carName', width: 12 },
      { header: '作業内容', key: 'title', width: 20 },
      { header: '項目', key: 'itemName', width: 20 },
      { header: '金額', key: 'cost', width: 10 },
    ];
    serviceHistories.forEach((sh) => {
      if (sh.items.length === 0) {
        historySheet.addRow({
          date: sh.date.toISOString().slice(0, 10),
          registrationNumber: sh.vehicle.registrationNumber,
          carName: sh.vehicle.carName,
          title: sh.title,
          itemName: '',
          cost: 0,
        });
        return;
      }

      sh.items.forEach((item) => {
        historySheet.addRow({
          date: sh.date.toISOString().slice(0, 10),
          registrationNumber: sh.vehicle.registrationNumber,
          carName: sh.vehicle.carName,
          title: sh.title,
          itemName: item.name,
          cost: item.cost,
        });
      });
    });

    return workbook.xlsx.writeBuffer();
  }
}
