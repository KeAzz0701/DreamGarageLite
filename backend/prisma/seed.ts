import { PrismaClient, Plan, LicenseStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {

  const company = await prisma.company.upsert({
    where: {
      id: 1,
    },
    update: {},
    create: {
      id: 1,
      name: 'Dream Garage',
      companyName: 'Dream Garage',
      email: 'admin@dreamgarage.jp',
      phone: '000-0000-0000',
    },
  });

  await prisma.license.upsert({
    where: {
      licenseKey: 'DG-TRIAL-2026',
    },
    update: {},
    create: {
      companyId: company.id,
      licenseKey: 'DG-TRIAL-2026',

      plan: Plan.PRO,

      status: LicenseStatus.ACTIVE,

      maxOcrPerMonth: -1,

      usedOcr: 0,

      activatedAt: new Date(),

      expiresAt: new Date('2099-12-31'),
    },
  });

  console.log('');
  console.log('===============================');
  console.log(' Seed Complete');
  console.log('===============================');
  console.log('');
  console.log('License');
  console.log('DG-TRIAL-2026');
  console.log('');
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });