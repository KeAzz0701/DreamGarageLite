import { BadRequestException, Injectable } from '@nestjs/common';
import { Plan, License, PaymentMethod } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  PLAN_LIMITS,
  getEffectivePlanLimits,
  DEMO_PLAN_CAPACITY,
} from '../common/plans';

// カード・電子決済・キャリア決済は決済代行サービスとの契約が済むまで利用不可
const ONLINE_PAYMENT_METHODS: PaymentMethod[] = [
  'CARD',
  'E_MONEY',
  'CARRIER_BILLING',
];

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

@Injectable()
export class LicenseService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async getLicense() {
    return this.prisma.license.findFirst();
  }

  async getByKey(licenseKey: string) {
    return this.prisma.license.findUnique({
      where: {
        licenseKey,
      },
    });
  }

  async activate(licenseKey: string) {

    const company = await this.prisma.company.findFirst();

    if (!company) {
      throw new BadRequestException('Company not found');
    }

    const license = await this.prisma.license.upsert({

      where: {
        licenseKey,
      },

      update: {
        activatedAt: new Date(),
        status: 'ACTIVE',
      },

      create: {

        company: {
          connect: {
            id: company.id,
          },
        },

        licenseKey,

        status: 'ACTIVE',

        activatedAt: new Date(),

        plan: 'FREE',

        maxOcrPerMonth: getEffectivePlanLimits('FREE', new Date()).maxOcrPerMonth,

        usedOcr: 0,

        usedOcrMonth: currentMonthKey(),

      },

    });

    await this.assignApiKey(company.id);

    return license;

  }

  /** 会社にAPIキーが未割り当てなら、プールから未使用のキーを1件自動で割り当てる */
  private async assignApiKey(companyId: number) {

    const existing = await this.prisma.apiKeyPool.findUnique({
      where: {
        companyId,
      },
    });

    if (existing) {
      return existing;
    }

    const unassigned = await this.prisma.apiKeyPool.findFirst({
      where: {
        companyId: null,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (!unassigned) {
      return null;
    }

    return this.prisma.apiKeyPool.update({
      where: {
        id: unassigned.id,
      },
      data: {
        companyId,
        assignedAt: new Date(),
      },
    });

  }

  async getApiKey(companyId: number) {

    const assignment = await this.prisma.apiKeyPool.findUnique({
      where: {
        companyId,
      },
    });

    return assignment?.apiKey ?? null;

  }

  async addApiKeyToPool(apiKey: string) {
    return this.prisma.apiKeyPool.create({
      data: {
        apiKey,
      },
    });
  }

  async update(id: number, data: any) {
    return this.prisma.license.update({
      where: {
        id,
      },
      data,
    });
  }

  /** 月が変わっていたらusedOcrを0に戻す */
  private async resetIfNewMonth(license: License): Promise<License> {

    const month = currentMonthKey();

    if (license.usedOcrMonth === month) {
      return license;
    }

    return this.prisma.license.update({
      where: {
        id: license.id,
      },
      data: {
        usedOcr: 0,
        usedOcrMonth: month,
      },
    });

  }

  async incrementOcr(companyId: number) {

    const company = await this.prisma.company.findUnique({

      where: {
        id: companyId,
      },

      include: {
        license: true,
      },

    });

    if (!company?.license) {
      return null;
    }

    await this.resetIfNewMonth(company.license);

    return this.prisma.license.update({

      where: {
        id: company.license.id,
      },

      data: {

        usedOcr: {
          increment: 1,
        },

      },

    });

  }

  async canUseOcr(companyId: number) {

    const company = await this.prisma.company.findUnique({

      where: {
        id: companyId,
      },

      include: {
        license: true,
      },

    });

    if (!company?.license) {
      return false;
    }

    const license = await this.resetIfNewMonth(company.license);

    const limits = getEffectivePlanLimits(
      license.plan as Plan,
      company.license.activatedAt,
    );

    if (limits.maxOcrPerMonth === -1) {
      return true;
    }

    return license.usedOcr < limits.maxOcrPerMonth;

  }

  /** プラン一覧と、指定会社の現在の実効プラン情報を返す */
  async getPlanInfo(companyId: number) {

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: { license: true },
    });

    const current = company?.license
      ? getEffectivePlanLimits(
          company.license.plan,
          company.license.activatedAt,
        )
      : null;

    const demoUsed = await this.prisma.license.count({
      where: { plan: 'DEMO' },
    });

    return {
      plans: PLAN_LIMITS,
      demoSlots: {
        used: demoUsed,
        capacity: DEMO_PLAN_CAPACITY,
      },
      current: current
        ? {
            plan: company!.license!.plan,
            limits: current,
            usedOcr: company!.license!.usedOcr,
          }
        : null,
    };

  }

  /** 管理者操作でプランを切り替える */
  async changePlan(companyId: number, plan: Plan) {

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: { license: true },
    });

    if (!company?.license) {
      throw new BadRequestException('License not found');
    }

    if (plan === 'DEMO' && company.license.plan !== 'DEMO') {
      const demoCount = await this.prisma.license.count({
        where: { plan: 'DEMO' },
      });

      if (demoCount >= DEMO_PLAN_CAPACITY) {
        throw new BadRequestException(
          `デモプレイ版は現在${DEMO_PLAN_CAPACITY}枠すべて利用中のため、切り替えできません。`,
        );
      }
    }

    return this.prisma.license.update({
      where: { id: company.license.id },
      data: {
        plan,
        maxOcrPerMonth: getEffectivePlanLimits(
          plan,
          company.license.activatedAt,
        ).maxOcrPerMonth,
      },
    });

  }

  /** プラン変更を申請する。現金・振込は承認待ちで登録、オンライン決済は現時点では未対応 */
  async requestPlanChange(
    companyId: number,
    targetPlan: Plan,
    paymentMethod: PaymentMethod,
  ) {

    if (ONLINE_PAYMENT_METHODS.includes(paymentMethod)) {
      throw new BadRequestException(
        'この支払い方法は準備中です。決済代行サービスとの契約が完了するまでご利用いただけません。',
      );
    }

    return this.prisma.planChangeRequest.create({
      data: {
        companyId,
        targetPlan,
        paymentMethod,
      },
    });

  }

  async listPlanChangeRequests(companyId: number) {
    return this.prisma.planChangeRequest.findMany({
      where: { companyId },
      orderBy: { requestedAt: 'desc' },
    });
  }

  /** 入金確認後、店舗側でこの申請を承認するとプランが実際に切り替わる */
  async approvePlanChangeRequest(requestId: number) {

    const request = await this.prisma.planChangeRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || request.status !== 'PENDING') {
      throw new BadRequestException('Request not found or already processed');
    }

    await this.changePlan(request.companyId, request.targetPlan);

    return this.prisma.planChangeRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
      },
    });

  }

  async rejectPlanChangeRequest(requestId: number) {
    return this.prisma.planChangeRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
      },
    });
  }
}