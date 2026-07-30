// backend/scripts/add-second-vehicle-demo.ts
//
// seed-demo-data.tsで投入した「佐藤 健一」様(1台目: DEMO-SHARED-VIN-0001のプリウス)に、
// 2台目の車両(見積・予約つき)を追加するスクリプト。1人のお客様が複数台を
// 登録しているパターンをデモデータに加えるためのもの。
//
// 実行方法:
//   cd backend
//   DATABASE_URL="postgresql://..." npx tsx scripts/add-second-vehicle-demo.ts

import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const FIRST_VEHICLE_VIN = 'DEMO-SHARED-VIN-0001';

function daysFromNow(days: number, hour = 10, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  const firstVehicle = await prisma.vehicle.findUnique({
    where: { vin: FIRST_VEHICLE_VIN },
    include: { customer: true },
  });

  if (!firstVehicle || !firstVehicle.customer) {
    console.error(
      `${FIRST_VEHICLE_VIN} の車両(佐藤 健一様の1台目)が見つかりません。先にseed-demo-data.tsを実行してください。`,
    );
    process.exit(1);
  }

  const customer = firstVehicle.customer;

  const existingSecond = await prisma.vehicle.findFirst({
    where: { customerId: customer.id, vin: { not: FIRST_VEHICLE_VIN } },
  });

  if (existingSecond) {
    console.log(`${customer.customerName}様は既に2台目(${existingSecond.carName} ${existingSecond.commonModelName})を登録済みです。何もしません。`);
    return;
  }

  const vehicle = await prisma.vehicle.create({
    data: {
      customerId: customer.id,
      vin: `${FIRST_VEHICLE_VIN}-B`,
      registrationNumber: '品川330う5678',
      ownerName: customer.customerName,
      ownerAddress: customer.customerAddress,
      userName: customer.customerName,
      userAddress: customer.customerAddress,
      usageBase: customer.customerAddress,
      carName: 'ホンダ',
      commonModelName: 'ヴェゼル',
      model: '6AA-RV5',
      engineModel: 'L15C',
      modelCode: 'DAA-RV5-XXXX',
      classificationCode: '6AA',
      firstRegistration: '2023-10-01',
      expirationDate: '2026-09-25',
      vehicleWeight: '1350',
      grossWeight: '1630',
      seatingCapacity: '5',
      maxLoad: '280',
      length: '4330',
      width: '1790',
      height: '1580',
      displacement: '1496',
      fuel: 'ハイブリッド',
      usage: '乗用',
      privateBusiness: '自家用',
      bodyType: 'SUV',
    },
  });

  const items = [
    { name: '自動車重量税', quantity: 1, unitPrice: 24600, laborCost: 0, isFee: true },
    { name: '自賠責保険料', quantity: 1, unitPrice: 17650, laborCost: 0, isFee: true },
    { name: '印紙代', quantity: 1, unitPrice: 1800, laborCost: 0, isFee: true },
    { name: 'エアコンフィルター交換', quantity: 1, unitPrice: 2400, laborCost: 800, isFee: false },
  ];

  await prisma.estimate.create({
    data: {
      vehicleId: vehicle.id,
      customerId: customer.id,
      title: '車検見積(2台目)',
      category: 'SHAKEN',
      staffName: '田中',
      items: {
        create: items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          laborCost: i.laborCost,
          cost: i.quantity * i.unitPrice + i.laborCost,
          isFee: i.isFee,
        })),
      },
    },
  });

  const start = daysFromNow(9);
  const end = daysFromNow(9, start.getHours() + 1);

  await prisma.reservation.create({
    data: {
      customerId: customer.id,
      vehicleId: vehicle.id,
      status: 'CONFIRMED',
      category: '車検',
      needsLoanerCar: false,
      scheduledStart: start,
      scheduledEnd: end,
      icsToken: randomUUID(),
    },
  });

  console.log(
    `  ✔ ${customer.customerName} 様の2台目として ${vehicle.carName} ${vehicle.commonModelName}（${vehicle.registrationNumber}）を追加しました`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
