// backend/src/portal/portal.service.ts

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MasterPrismaService } from '../prisma/master-prisma.service';
import { LineService } from '../line/line.service';
import { LicenseService } from '../license/license.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { CompetitorEstimateService } from '../competitor-estimate/competitor-estimate.service';
import { groupAndEstimate } from '../common/tire-wear';

@Injectable()
export class PortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly masterPrisma: MasterPrismaService,
    private readonly lineService: LineService,
    private readonly licenseService: LicenseService,
    private readonly tenantContext: TenantContextService,
    private readonly competitorEstimateService: CompetitorEstimateService,
  ) {}

  /** LIFFのIDトークンを検証し、連携済みなら直近やり取りのあった会社をデフォルトに解決する */
  async verifyAndResolveLogin(idToken: string) {
    const lineUserId = await this.lineService.verifyLiffIdToken(idToken);

    if (!lineUserId) {
      throw new UnauthorizedException('LINEの認証情報を確認できませんでした。');
    }

    const links = await this.lineService.findLinksForUser(lineUserId);

    if (links.length === 0) {
      return { linked: false as const, lineUserId };
    }

    const active = links[0];
    await this.lineService.touchCompanyLinkActivity(lineUserId, active.companyAccountId);

    return {
      linked: true as const,
      lineUserId,
      activeCompanyId: active.companyAccountId,
      activeTenantCustomerId: active.tenantCustomerId,
      companies: links.map((l) => ({
        companyAccountId: l.companyAccountId,
        displayName: l.companyAccount.displayName,
      })),
    };
  }

  /** 別の連携先企業に切り替える。クライアント申告のtenantCustomerIdは信用せず、マスターDBで都度引き直す */
  async switchCompany(lineUserId: string, companyAccountId: number) {
    const link = await this.masterPrisma.lineCompanyLink.findUnique({
      where: { lineUserId_companyAccountId: { lineUserId, companyAccountId } },
    });

    if (!link) {
      throw new NotFoundException('連携が見つかりませんでした。');
    }

    await this.lineService.touchCompanyLinkActivity(lineUserId, companyAccountId);

    return { tenantCustomerId: link.tenantCustomerId };
  }

  /** 連携中の全店舗について、それぞれの有料フラグをまとめて返す(店舗を切り替えなくても一覧で確認できるように) */
  async listCompanyStatuses(lineUserId: string) {
    const links = await this.masterPrisma.lineCompanyLink.findMany({
      where: { lineUserId },
      include: { companyAccount: true },
      orderBy: { lastActiveAt: 'desc' },
    });

    const results: { companyAccountId: number; displayName: string; portalPaid: boolean }[] = [];

    for (const link of links) {
      const customer = await this.tenantContext.run(link.companyAccount, () =>
        this.prisma.customer.findUnique({
          where: { id: link.tenantCustomerId },
          select: { portalPaid: true },
        }),
      );

      results.push({
        companyAccountId: link.companyAccountId,
        displayName: link.companyAccount.displayName,
        portalPaid: customer?.portalPaid ?? false,
      });
    }

    return results;
  }

  private async requireCustomer(customerId: number) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });

    if (!customer) {
      throw new NotFoundException('顧客情報が見つかりませんでした。');
    }

    return customer;
  }

  private async requirePaidCustomer(customerId: number) {
    const customer = await this.requireCustomer(customerId);

    if (!customer.portalPaid) {
      throw new ForbiddenException('このプランではご利用いただけません。');
    }

    return customer;
  }

  /** 無料範囲: 車両情報+車検満了日 */
  async getMe(customerId: number) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: { vehicles: { orderBy: { updatedAt: 'desc' } } },
    });

    if (!customer) {
      throw new NotFoundException('顧客情報が見つかりませんでした。');
    }

    return {
      customerName: customer.customerName,
      portalPaid: customer.portalPaid,
      vehicles: customer.vehicles.map((v) => ({
        id: v.id,
        carName: v.carName,
        commonModelName: v.commonModelName,
        registrationNumber: v.registrationNumber,
        expirationDate: v.expirationDate,
      })),
    };
  }

  /** 有料範囲: 整備履歴(金額明細つき) */
  async getServiceHistory(customerId: number) {
    await this.requirePaidCustomer(customerId);

    const vehicles = await this.prisma.vehicle.findMany({
      where: { customerId },
      include: {
        serviceHistories: {
          where: { voided: false, visibleInPortal: true },
          include: { items: true },
          orderBy: { date: 'desc' },
        },
      },
    });

    return vehicles.map((v) => ({
      vehicleId: v.id,
      carName: v.carName,
      commonModelName: v.commonModelName,
      serviceHistories: v.serviceHistories.map((sh) => ({
        id: sh.id,
        date: sh.date,
        title: sh.title,
        mileage: sh.mileage,
        items: sh.items.map((i) => ({ name: i.name, cost: i.cost })),
        total: sh.items.reduce((s, i) => s + i.cost, 0),
      })),
    }));
  }

  /** 有料範囲: 次回整備のおすすめ(車検・オイル・タイヤの日付ベースリマインド) */
  async getMaintenanceRecommendations(customerId: number) {
    await this.requirePaidCustomer(customerId);

    const [shaken, oil, tire] = await Promise.all([
      this.lineService.getShakenReminderCandidates(),
      this.lineService.getMaintenanceReminderCandidates('OIL'),
      this.lineService.getMaintenanceReminderCandidates('TIRE'),
    ]);

    return {
      shaken: shaken.filter((c) => c.customerId === customerId),
      oil: oil.filter((c) => c.customerId === customerId),
      tire: tire.filter((c) => c.customerId === customerId),
    };
  }

  /** 有料範囲: タイヤ溝の測定データからの推定交換時期 */
  async getTireWear(customerId: number) {
    await this.requirePaidCustomer(customerId);

    const vehicles = await this.prisma.vehicle.findMany({
      where: { customerId },
      include: { tireMeasurements: { orderBy: { date: 'desc' } } },
    });

    return vehicles.map((v) => ({
      vehicleId: v.id,
      carName: v.carName,
      commonModelName: v.commonModelName,
      estimates: groupAndEstimate(
        v.tireMeasurements.map((m) => ({
          position: m.position,
          tireType: m.tireType,
          date: m.date,
          treadDepthMm: m.treadDepthMm,
          mileage: m.mileage,
          isNewTire: m.isNewTire,
        })),
      ),
    }));
  }

  /** 無料範囲: 他店舗見積のスキャン(自分の車両にのみ登録できる。共有可否は顧客自身が選ぶ) */
  async createCompetitorEstimate(
    customerId: number,
    vehicleId: number,
    file: { buffer: Buffer; mimetype: string },
    sharedWithShop: boolean,
  ) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });

    if (!vehicle || vehicle.customerId !== customerId) {
      throw new BadRequestException('指定された車両が見つかりませんでした。');
    }

    const companyAccountId = this.tenantContext.current()!.company.id;
    const apiKey = await this.licenseService.getApiKey(companyAccountId);

    return this.competitorEstimateService.analyzeAndCreate(
      vehicleId,
      customerId,
      file,
      'CUSTOMER',
      sharedWithShop,
      apiKey ?? undefined,
    );
  }

  async listCompetitorEstimates(customerId: number) {
    return this.competitorEstimateService.getByCustomer(customerId);
  }

  async getCompetitorEstimateImage(customerId: number, id: number) {
    return this.competitorEstimateService.getImageForCustomer(id, customerId);
  }
}
