// backend/src/company/company.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getEffectivePlanLimits } from '../common/plans';

@Injectable()
export class CompanyService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async getCompany() {
    const company = await this.prisma.company.findFirst({
      include: {
        license: true,
        settings: true,
      },
    });

    // license.maxOcrPerMonthはプラン変更時に都度書き込む保存値のため、書き込み漏れ等で
    // 現在のプラン定義(backend/src/common/plans.ts)とズレたまま残ることがある
    // (実際の利用可否判定はgetEffectivePlanLimitsを都度計算しており影響は無いが、
    // 表示上の数字だけ古いままになる)。表示のズレを防ぐため、ここで都度上書きする
    if (company?.license) {
      company.license.maxOcrPerMonth = getEffectivePlanLimits(
        company.license.plan,
        company.license.activatedAt,
        company.license.hasUsedPaidPlan,
      ).maxOcrPerMonth;
    }

    return company;
  }

  async createCompany(data: any) {
    return this.prisma.company.create({
      data,
      include: {
        license: true,
        settings: true,
      },
    });
  }

  async updateCompany(id: number, data: any) {
    return this.prisma.company.update({
      where: {
        id,
      },
      data,
      include: {
        license: true,
        settings: true,
      },
    });
  }
}