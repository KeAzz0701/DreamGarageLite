// backend/scripts/seed-demo-data.ts
//
// デモ用の顧客・車両・見積・予約データを1テナントDBにまとめて投入するスクリプト。
// 2社分(dream_garage_lite / dream_garage_demo0001)に同じ内容で実行することで、
// 2社をまたいで同一顧客・同一車両(同じVIN・登録番号)が「たまたま両方の店舗に
// 存在する」状態を再現する(先頭2件が共通、残り3件は会社ごとに固有)。
//
// 実行方法:
//   cd backend
//   DATABASE_URL="postgresql://..." npx tsx scripts/seed-demo-data.ts

import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function daysFromNow(days: number, hour = 10, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

interface DemoRecord {
  customer: {
    customerName: string;
    customerNameReading: string;
    customerAddress: string;
    phone: string;
  };
  vehicle: {
    vin: string;
    registrationNumber: string;
    carName: string;
    commonModelName: string;
    model: string;
    engineModel: string;
    modelCode: string;
    classificationCode: string;
    firstRegistration: string;
    expirationDate: string;
    vehicleWeight: string;
    grossWeight: string;
    seatingCapacity: string;
    maxLoad: string;
    length: string;
    width: string;
    height: string;
    displacement: string;
    fuel: string;
    usage: string;
    privateBusiness: string;
    bodyType: string;
  };
  estimate: {
    title: string;
    category: 'GENERAL' | 'SHAKEN';
    staffName: string;
    items: { name: string; quantity: number; unitPrice: number; laborCost: number; isFee: boolean }[];
  };
  reservation: {
    category: string;
    daysFromNow: number;
    needsLoanerCar: boolean;
  };
}

// 先頭2件 = 2社共通(同一顧客・同一車両が両店舗にたまたま存在する想定)
// 残り3件 = 会社ごとに固有
const SHARED_RECORDS: DemoRecord[] = [
  {
    customer: {
      customerName: '佐藤 健一',
      customerNameReading: 'さとう けんいち',
      customerAddress: '東京都品川区西五反田1-2-3',
      phone: '090-1234-5601',
    },
    vehicle: {
      vin: 'DEMO-SHARED-VIN-0001',
      registrationNumber: '品川300あ1234',
      carName: 'トヨタ',
      commonModelName: 'プリウス',
      model: '6AA-MXWH60',
      engineModel: 'M15A-FXE',
      modelCode: 'DAA-ZVW51-AWXGB',
      classificationCode: '300',
      firstRegistration: '2021-04-01',
      expirationDate: '2027-04-01',
      vehicleWeight: '1430',
      grossWeight: '1730',
      seatingCapacity: '5',
      maxLoad: '300',
      length: '4600',
      width: '1780',
      height: '1430',
      displacement: '1797',
      fuel: 'ハイブリッド',
      usage: '乗用',
      privateBusiness: '自家用',
      bodyType: 'セダン',
    },
    estimate: {
      title: '車検見積',
      category: 'SHAKEN',
      staffName: '田中',
      items: [
        { name: '自動車重量税', quantity: 1, unitPrice: 24600, laborCost: 0, isFee: true },
        { name: '自賠責保険料', quantity: 1, unitPrice: 17650, laborCost: 0, isFee: true },
        { name: '印紙代', quantity: 1, unitPrice: 1800, laborCost: 0, isFee: true },
        { name: 'ブレーキフルード交換', quantity: 1, unitPrice: 1800, laborCost: 2200, isFee: false },
        { name: 'エンジンオイル交換', quantity: 4, unitPrice: 900, laborCost: 1500, isFee: false },
      ],
    },
    reservation: { category: '車検', daysFromNow: 6, needsLoanerCar: true },
  },
  {
    customer: {
      customerName: '鈴木 美咲',
      customerNameReading: 'すずき みさき',
      customerAddress: '東京都練馬区豊玉北2-4-6',
      phone: '090-1234-5602',
    },
    vehicle: {
      vin: 'DEMO-SHARED-VIN-0002',
      registrationNumber: '練馬500さ5678',
      carName: 'ホンダ',
      commonModelName: 'フィット',
      model: '6AA-GR3',
      engineModel: 'L13B',
      modelCode: 'DAA-GK3-XXXX',
      classificationCode: '105',
      firstRegistration: '2022-07-01',
      expirationDate: '2026-08-15',
      vehicleWeight: '1050',
      grossWeight: '1310',
      seatingCapacity: '5',
      maxLoad: '260',
      length: '3995',
      width: '1695',
      height: '1525',
      displacement: '1317',
      fuel: 'ガソリン',
      usage: '乗用',
      privateBusiness: '自家用',
      bodyType: 'ワゴン',
    },
    estimate: {
      title: '定期点検見積',
      category: 'GENERAL',
      staffName: '田中',
      items: [
        { name: 'タイヤ交換(4本)', quantity: 4, unitPrice: 8500, laborCost: 4000, isFee: false },
        { name: 'ワイパーゴム交換', quantity: 2, unitPrice: 1200, laborCost: 600, isFee: false },
      ],
    },
    reservation: { category: '一般整備', daysFromNow: 3, needsLoanerCar: false },
  },
];

const UNIQUE_RECORDS_BY_COMPANY: Record<'lite' | 'demo', DemoRecord[]> = {
  lite: [
    {
      customer: {
        customerName: '高橋 直樹',
        customerNameReading: 'たかはし なおき',
        customerAddress: '東京都杉並区阿佐谷北3-5-7',
        phone: '090-1234-5603',
      },
      vehicle: {
        vin: 'DEMO-LITE-VIN-0003',
        registrationNumber: '杉並800な9012',
        carName: '日産',
        commonModelName: 'セレナ',
        model: '6AA-GFC27',
        engineModel: 'HR12DE',
        modelCode: 'DAA-GFC27-XXXX',
        classificationCode: '588',
        firstRegistration: '2020-03-01',
        expirationDate: '2026-09-10',
        vehicleWeight: '1690',
        grossWeight: '2110',
        seatingCapacity: '7',
        maxLoad: '420',
        length: '4690',
        width: '1695',
        height: '1865',
        displacement: '1997',
        fuel: 'ハイブリッド',
        usage: '乗用',
        privateBusiness: '自家用',
        bodyType: 'ワゴン',
      },
      estimate: {
        title: '車検見積',
        category: 'SHAKEN',
        staffName: '鈴木',
        items: [
          { name: '自動車重量税', quantity: 1, unitPrice: 32800, laborCost: 0, isFee: true },
          { name: '自賠責保険料', quantity: 1, unitPrice: 17650, laborCost: 0, isFee: true },
          { name: '印紙代', quantity: 1, unitPrice: 1800, laborCost: 0, isFee: true },
          { name: 'バッテリー交換', quantity: 1, unitPrice: 15800, laborCost: 1500, isFee: false },
        ],
      },
      reservation: { category: '車検', daysFromNow: 10, needsLoanerCar: true },
    },
    {
      customer: {
        customerName: '田中 さくら',
        customerNameReading: 'たなか さくら',
        customerAddress: '東京都世田谷区三軒茶屋2-8-1',
        phone: '090-1234-5604',
      },
      vehicle: {
        vin: 'DEMO-LITE-VIN-0004',
        registrationNumber: '世田谷330さ3456',
        carName: 'スバル',
        commonModelName: 'インプレッサ',
        model: '5AA-GT7',
        engineModel: 'FB16',
        modelCode: 'DBA-GT7-XXXX',
        classificationCode: '420',
        firstRegistration: '2023-01-01',
        expirationDate: '2026-11-20',
        vehicleWeight: '1360',
        grossWeight: '1635',
        seatingCapacity: '5',
        maxLoad: '275',
        length: '4460',
        width: '1775',
        height: '1440',
        displacement: '1600',
        fuel: 'ガソリン',
        usage: '乗用',
        privateBusiness: '自家用',
        bodyType: 'セダン',
      },
      estimate: {
        title: 'オイル交換・点検見積',
        category: 'GENERAL',
        staffName: '鈴木',
        items: [
          { name: 'エンジンオイル交換', quantity: 4, unitPrice: 1100, laborCost: 1500, isFee: false },
          { name: 'オイルエレメント交換', quantity: 1, unitPrice: 1500, laborCost: 800, isFee: false },
        ],
      },
      reservation: { category: '一般整備', daysFromNow: 2, needsLoanerCar: false },
    },
    {
      customer: {
        customerName: '伊藤 大輔',
        customerNameReading: 'いとう だいすけ',
        customerAddress: '東京都目黒区中目黒4-11-2',
        phone: '090-1234-5605',
      },
      vehicle: {
        vin: 'DEMO-LITE-VIN-0005',
        registrationNumber: '目黒500い7890',
        carName: 'マツダ',
        commonModelName: 'CX-5',
        model: '3DA-KF2P',
        engineModel: 'PY-VPS',
        modelCode: 'DBA-KF2P-XXXX',
        classificationCode: '3DA',
        firstRegistration: '2021-09-01',
        expirationDate: '2027-01-05',
        vehicleWeight: '1590',
        grossWeight: '1890',
        seatingCapacity: '5',
        maxLoad: '300',
        length: '4575',
        width: '1845',
        height: '1690',
        displacement: '2488',
        fuel: 'ガソリン',
        usage: '乗用',
        privateBusiness: '自家用',
        bodyType: 'ワゴン',
      },
      estimate: {
        title: 'タイヤ・ブレーキ点検見積',
        category: 'GENERAL',
        staffName: '田中',
        items: [
          { name: 'ブレーキパッド交換(前)', quantity: 1, unitPrice: 9800, laborCost: 4500, isFee: false },
          { name: 'タイヤ空気圧調整', quantity: 1, unitPrice: 0, laborCost: 500, isFee: false },
        ],
      },
      reservation: { category: '一般整備', daysFromNow: 8, needsLoanerCar: false },
    },
  ],
  demo: [
    {
      customer: {
        customerName: '渡辺 陽子',
        customerNameReading: 'わたなべ ようこ',
        customerAddress: '東京都新宿区西新宿6-3-9',
        phone: '090-1234-5606',
      },
      vehicle: {
        vin: 'DEMO-DEMO-VIN-0003',
        registrationNumber: '新宿330わ2345',
        carName: 'レクサス',
        commonModelName: 'NX',
        model: '6AA-AAZH20',
        engineModel: 'A25A-FXS',
        modelCode: 'DAA-AAZH20-XXXX',
        classificationCode: '6AA',
        firstRegistration: '2022-05-01',
        expirationDate: '2026-10-01',
        vehicleWeight: '1810',
        grossWeight: '2110',
        seatingCapacity: '5',
        maxLoad: '300',
        length: '4660',
        width: '1865',
        height: '1660',
        displacement: '2487',
        fuel: 'ハイブリッド',
        usage: '乗用',
        privateBusiness: '自家用',
        bodyType: 'SUV',
      },
      estimate: {
        title: '車検見積',
        category: 'SHAKEN',
        staffName: '佐々木',
        items: [
          { name: '自動車重量税', quantity: 1, unitPrice: 32800, laborCost: 0, isFee: true },
          { name: '自賠責保険料', quantity: 1, unitPrice: 17650, laborCost: 0, isFee: true },
          { name: '印紙代', quantity: 1, unitPrice: 1800, laborCost: 0, isFee: true },
          { name: 'ナビ地図ソフト更新', quantity: 1, unitPrice: 21600, laborCost: 1620, isFee: false },
        ],
      },
      reservation: { category: '車検', daysFromNow: 12, needsLoanerCar: true },
    },
    {
      customer: {
        customerName: '中村 翔太',
        customerNameReading: 'なかむら しょうた',
        customerAddress: '東京都板橋区大山町1-14',
        phone: '090-1234-5607',
      },
      vehicle: {
        vin: 'DEMO-DEMO-VIN-0004',
        registrationNumber: '練馬580な6789',
        carName: 'スズキ',
        commonModelName: 'ハスラー',
        model: '5BA-MR52S',
        engineModel: 'R06A',
        modelCode: 'DAA-MR52S-XXXX',
        classificationCode: '5BA',
        firstRegistration: '2023-06-01',
        expirationDate: '2026-12-15',
        vehicleWeight: '830',
        grossWeight: '1030',
        seatingCapacity: '4',
        maxLoad: '200',
        length: '3395',
        width: '1475',
        height: '1680',
        displacement: '658',
        fuel: 'ハイブリッド',
        usage: '乗用',
        privateBusiness: '自家用',
        bodyType: '軽自動車',
      },
      estimate: {
        title: 'オイル交換見積',
        category: 'GENERAL',
        staffName: '佐々木',
        items: [
          { name: 'エンジンオイル交換', quantity: 3, unitPrice: 950, laborCost: 1200, isFee: false },
        ],
      },
      reservation: { category: '一般整備', daysFromNow: 4, needsLoanerCar: false },
    },
    {
      customer: {
        customerName: '小林 真由美',
        customerNameReading: 'こばやし まゆみ',
        customerAddress: '東京都足立区千住3-2-1',
        phone: '090-1234-5608',
      },
      vehicle: {
        vin: 'DEMO-DEMO-VIN-0005',
        registrationNumber: '足立400こ4567',
        carName: 'ダイハツ',
        commonModelName: 'タント',
        model: '5BA-LA660S',
        engineModel: 'KF',
        modelCode: 'DAA-LA660S-XXXX',
        classificationCode: '5BA',
        firstRegistration: '2021-11-01',
        expirationDate: '2026-08-25',
        vehicleWeight: '870',
        grossWeight: '1070',
        seatingCapacity: '4',
        maxLoad: '200',
        length: '3395',
        width: '1475',
        height: '1755',
        displacement: '658',
        fuel: 'ガソリン',
        usage: '乗用',
        privateBusiness: '自家用',
        bodyType: '軽自動車',
      },
      estimate: {
        title: '車検見積',
        category: 'SHAKEN',
        staffName: '佐々木',
        items: [
          { name: '自動車重量税', quantity: 1, unitPrice: 16400, laborCost: 0, isFee: true },
          { name: '自賠責保険料', quantity: 1, unitPrice: 17650, laborCost: 0, isFee: true },
          { name: '印紙代', quantity: 1, unitPrice: 1800, laborCost: 0, isFee: true },
          { name: 'ワイパーブレード交換', quantity: 1, unitPrice: 1600, laborCost: 500, isFee: false },
        ],
      },
      reservation: { category: '車検', daysFromNow: 15, needsLoanerCar: false },
    },
  ],
};

async function seedRecord(record: DemoRecord) {
  const customer = await prisma.customer.create({
    data: {
      customerName: record.customer.customerName,
      customerNameReading: record.customer.customerNameReading,
      customerAddress: record.customer.customerAddress,
      ownerName: record.customer.customerName,
      ownerAddress: record.customer.customerAddress,
      phone: record.customer.phone,
    },
  });

  const vehicle = await prisma.vehicle.create({
    data: {
      customerId: customer.id,
      vin: record.vehicle.vin,
      registrationNumber: record.vehicle.registrationNumber,
      ownerName: record.customer.customerName,
      ownerAddress: record.customer.customerAddress,
      userName: record.customer.customerName,
      userAddress: record.customer.customerAddress,
      usageBase: record.customer.customerAddress,
      carName: record.vehicle.carName,
      commonModelName: record.vehicle.commonModelName,
      model: record.vehicle.model,
      engineModel: record.vehicle.engineModel,
      modelCode: record.vehicle.modelCode,
      classificationCode: record.vehicle.classificationCode,
      firstRegistration: record.vehicle.firstRegistration,
      expirationDate: record.vehicle.expirationDate,
      vehicleWeight: record.vehicle.vehicleWeight,
      grossWeight: record.vehicle.grossWeight,
      seatingCapacity: record.vehicle.seatingCapacity,
      maxLoad: record.vehicle.maxLoad,
      length: record.vehicle.length,
      width: record.vehicle.width,
      height: record.vehicle.height,
      displacement: record.vehicle.displacement,
      fuel: record.vehicle.fuel,
      usage: record.vehicle.usage,
      privateBusiness: record.vehicle.privateBusiness,
      bodyType: record.vehicle.bodyType,
    },
  });

  const items = record.estimate.items.map((i) => ({
    name: i.name,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    laborCost: i.laborCost,
    cost: i.quantity * i.unitPrice + i.laborCost,
    isFee: i.isFee,
  }));

  await prisma.estimate.create({
    data: {
      vehicleId: vehicle.id,
      customerId: customer.id,
      title: record.estimate.title,
      category: record.estimate.category,
      staffName: record.estimate.staffName,
      items: { create: items },
    },
  });

  const start = daysFromNow(record.reservation.daysFromNow);
  const end = daysFromNow(record.reservation.daysFromNow, start.getHours() + 1);

  await prisma.reservation.create({
    data: {
      customerId: customer.id,
      vehicleId: vehicle.id,
      status: 'CONFIRMED',
      category: record.reservation.category,
      needsLoanerCar: record.reservation.needsLoanerCar,
      scheduledStart: start,
      scheduledEnd: end,
      icsToken: randomUUID(),
    },
  });

  console.log(`  ✔ ${customer.customerName} / ${vehicle.carName} ${vehicle.commonModelName}（${vehicle.registrationNumber}）`);
}

async function main() {
  const which = process.argv[2];
  if (which !== 'lite' && which !== 'demo') {
    console.error('使い方: DATABASE_URL=... npx tsx scripts/seed-demo-data.ts lite|demo');
    process.exit(1);
  }

  console.log(`共通2件を投入します...`);
  for (const r of SHARED_RECORDS) {
    await seedRecord(r);
  }

  console.log(`${which}固有の3件を投入します...`);
  for (const r of UNIQUE_RECORDS_BY_COMPANY[which]) {
    await seedRecord(r);
  }

  console.log('完了しました。');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
