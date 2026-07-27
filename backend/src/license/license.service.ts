import { BadRequestException, Injectable } from '@nestjs/common';
import { Plan, License, PaymentMethod } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MasterPrismaService } from '../prisma/master-prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import {
  PLAN_LIMITS,
  getEffectivePlanLimits,
  getTrialDaysRemaining,
  DEMO_PLAN_CAPACITY,
  PlanLimits,
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

type KeyTier = 'FREE' | 'PAID';

/** 有料プランに切り替わったら、上位(PAID)のAPIキーを優先して割り当てる */
function tierForPlan(plan: Plan): KeyTier {
  return plan === 'FREE' || plan === 'DEMO' ? 'FREE' : 'PAID';
}

@Injectable()
export class LicenseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly masterPrisma: MasterPrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async getLicense() {
    return this.prisma.license.findFirst();
  }

  /**
   * 現在のテナントのプラン機能フラグ(predictiveMaintenance/aiChat/webReservation等)を返す。
   * ライセンスが見つからない(通常あり得ない)場合はnullを返し、呼び出し側はfail-openで
   * 機能を許可する側に倒すこと。
   */
  async getCurrentPlanLimits(): Promise<PlanLimits | null> {
    const license = await this.prisma.license.findFirst();

    if (!license) return null;

    return getEffectivePlanLimits(
      license.plan,
      license.activatedAt,
      license.hasUsedPaidPlan,
    );
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

    // 既に一度でも認証済みなら、activatedAtは変更しない。ここを毎回更新すると
    // 同じライセンスキーを/licenseページで再入力するだけで無料お試し期間が
    // 何度でも復活してしまう(既知の抜け穴として2026-07-27に修正)。
    const existing = await this.prisma.license.findUnique({
      where: { licenseKey },
    });

    const license = await this.prisma.license.upsert({

      where: {
        licenseKey,
      },

      update: existing?.activatedAt
        ? { status: 'ACTIVE' }
        : { activatedAt: new Date(), status: 'ACTIVE' },

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

    const companyAccountId = this.tenantContext.current()?.company.id;

    if (companyAccountId) {
      await this.assignApiKey(companyAccountId, tierForPlan(license.plan as Plan));
    }

    return license;

  }

  /**
   * 会社にAPIキーを割り当てる。APIキーは会社ごとにDBが分かれているため
   * マスターDB側の共有プールで管理する(companyAccountIdはテナントの
   * company.idではなく、マスターDBのCompanyAccount.id)。
   * すでに割り当て済みで、希望のtier(有料プラン等)に満たない場合は、
   * 該当tierの空きキーがあれば入れ替える。
   */
  private async assignApiKey(companyAccountId: number, desiredTier: KeyTier = 'FREE') {

    const existing = await this.masterPrisma.apiKeyPool.findUnique({
      where: { companyAccountId },
    });

    if (existing && existing.tier === desiredTier) {
      return existing;
    }

    // 希望tierの空きキーへ入れ替えられるか探す(PAID→FREEへの降格も含む。
    // 降格を素通りさせると有料枠のキーが解約後も使われ続け、他社に回せなくなるため)
    const swapTarget = await this.masterPrisma.apiKeyPool.findFirst({
      where: { companyAccountId: null, tier: desiredTier },
      orderBy: { createdAt: 'asc' },
    });

    if (swapTarget) {
      if (existing) {
        await this.masterPrisma.apiKeyPool.update({
          where: { id: existing.id },
          data: { companyAccountId: null, assignedAt: null },
        });
      }

      return this.masterPrisma.apiKeyPool.update({
        where: { id: swapTarget.id },
        data: { companyAccountId, assignedAt: new Date() },
      });
    }

    // 無料枠への降格で空きが無い場合でも、有料枠を無駄に保持させ続けない。
    // 割り当てを解除し(無料枠の空きが出来次第、次回アクセス時に再割り当てされる)、
    // 有料枠は他社が使えるよう空けておく
    if (desiredTier === 'FREE') {
      if (existing) {
        await this.masterPrisma.apiKeyPool.update({
          where: { id: existing.id },
          data: { companyAccountId: null, assignedAt: null },
        });
      }

      return null;
    }

    // 希望tier(有料枠等)の在庫が無い場合、既存の割り当てがあればそのまま維持する
    if (existing) {
      return existing;
    }

    // 何も割り当てが無い場合は、tierを問わず空いているキーを割り当てる
    const anyUnassigned = await this.masterPrisma.apiKeyPool.findFirst({
      where: { companyAccountId: null },
      orderBy: { createdAt: 'asc' },
    });

    if (!anyUnassigned) {
      return null;
    }

    return this.masterPrisma.apiKeyPool.update({
      where: { id: anyUnassigned.id },
      data: { companyAccountId, assignedAt: new Date() },
    });

  }

  /** companyIdは呼び出し元の互換のため残しているが、実際の割り当ては
   * 現在のテナントコンテキスト(マスターDBのCompanyAccount)を使って引く */
  async getApiKey(companyId: number) {

    const companyAccountId = this.tenantContext.current()?.company.id;

    if (!companyAccountId) {
      return null;
    }

    const assignment = await this.masterPrisma.apiKeyPool.findUnique({
      where: { companyAccountId },
    });

    return assignment?.apiKey ?? null;

  }

  async addApiKeyToPool(apiKey: string, tier: KeyTier = 'FREE') {
    return this.masterPrisma.apiKeyPool.create({
      data: {
        apiKey,
        tier,
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
      company.license.hasUsedPaidPlan,
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
          company.license.hasUsedPaidPlan,
        )
      : null;

    // デモ枠のカウントは会社ごとに別DBに分かれているテナントDB側では正しく数えられない
    // (自社の1件しか見えない)ため、全社を横断できるマスターDBのミラー列を使う
    const demoUsed = await this.masterPrisma.companyAccount.count({
      where: { currentPlan: 'DEMO' },
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
            trialDaysRemaining: getTrialDaysRemaining(
              company!.license!.plan,
              company!.license!.activatedAt,
              company!.license!.hasUsedPaidPlan,
            ),
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
      // this.prisma(テナントDB)は自社の1件しか見えないため、必ずマスターDBの
      // currentPlanミラー列を使って全社を横断カウントする(修正前は自社1件しか
      // 数えられず、実質10社制限が機能していなかった)
      const demoCount = await this.masterPrisma.companyAccount.count({
        where: { currentPlan: 'DEMO' },
      });

      if (demoCount >= DEMO_PLAN_CAPACITY) {
        throw new BadRequestException(
          `デモプレイ版は現在${DEMO_PLAN_CAPACITY}枠すべて利用中のため、切り替えできません。`,
        );
      }
    }

    // 一度でも有料プランに切り替えたら、以後FREEに戻っても初月お試し特典は与えない
    const isPaidPlan = plan !== 'FREE' && plan !== 'DEMO';
    const hasUsedPaidPlan = company.license.hasUsedPaidPlan || isPaidPlan;

    const updated = await this.prisma.license.update({
      where: { id: company.license.id },
      data: {
        plan,
        hasUsedPaidPlan,
        maxOcrPerMonth: getEffectivePlanLimits(
          plan,
          company.license.activatedAt,
          hasUsedPaidPlan,
        ).maxOcrPerMonth,
      },
    });

    // 有料プランに切り替わったら、プールに上位キーの空きがあれば入れ替える
    const companyAccountId = this.tenantContext.current()?.company.id;

    if (companyAccountId) {
      await this.assignApiKey(companyAccountId, tierForPlan(plan));

      // デモ枠カウント等、全社横断の集計はテナントDBから原理的にできないため
      // マスターDB側にも現在のプランをミラーしておく
      await this.masterPrisma.companyAccount.update({
        where: { id: companyAccountId },
        data: { currentPlan: plan },
      });
    }

    return updated;

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