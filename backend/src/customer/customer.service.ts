import {
  BadRequestException,
  Injectable,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getEffectivePlanLimits } from '../common/plans';
import { LineService } from '../line/line.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { KanaReadingService } from '../common/kana-reading.service';

interface FindOrCreateCustomerDto {
  customerName: string;
  customerAddress?: string;
  ownerName?: string;
  ownerAddress?: string;
  phone?: string;
}

// スタッフが手動でメッセージを送った後、この時間はAIの自動応答を止めて
// 「担当者が対応中」の案内に切り替える。以降さらに手動メッセージを送るたびに延長される
const STAFF_TAKEOVER_PAUSE_MINUTES = 30;

@Injectable()
export class CustomerService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => LineService))
    private readonly lineService: LineService,
    private readonly tenantContext: TenantContextService,
    private readonly kanaReadingService: KanaReadingService,
  ) {}

  async findOrCreate(data: FindOrCreateCustomerDto) {
    const name = (data.customerName ?? '').trim();

    if (!name) {
      throw new BadRequestException('customerName is required.');
    }

    const address = (data.customerAddress ?? '').trim();

    const customer = await this.prisma.customer.findFirst({
      where: {
        customerName: name,
        customerAddress: address || undefined,
      },
    });

    if (customer) {
      return await this.prisma.customer.update({
        where: {
          id: customer.id,
        },
        data: {
          customerAddress: address || customer.customerAddress,
          ownerName: data.ownerName,
          ownerAddress: data.ownerAddress,
          phone: data.phone ?? customer.phone,
          customerNameReading:
            customer.customerNameReading ?? (await this.kanaReadingService.getReading(name)),
        },
      });
    }

    // 新規登録時のみ、プランの顧客登録上限をチェックする
    const license = await this.prisma.license.findFirst();

    if (license) {
      const limits = getEffectivePlanLimits(
        license.plan,
        license.activatedAt,
        license.hasUsedPaidPlan,
      );

      if (limits.maxCustomers !== null) {
        const count = await this.prisma.customer.count();

        if (count >= limits.maxCustomers) {
          throw new BadRequestException(
            `顧客登録数の上限(${limits.maxCustomers}件)に達しています。プランのアップグレードが必要です。`,
          );
        }
      }
    }

    return await this.prisma.customer.create({
      data: {
        customerName: name,
        customerNameReading: await this.kanaReadingService.getReading(name),
        customerAddress: address,
        ownerName: data.ownerName,
        ownerAddress: data.ownerAddress,
        phone: data.phone ?? '',
      },
    });
  }

  async getAll() {
    return this.prisma.customer.findMany({
      include: {
        vehicles: {
          orderBy: {
            updatedAt: 'desc',
          },
        },
      },
      orderBy: {
        customerName: 'asc',
      },
    });
  }

  async getById(id: number) {
    return this.prisma.customer.findUnique({
      where: {
        id,
      },
      include: {
        vehicles: {
          orderBy: {
            updatedAt: 'desc',
          },
        },
      },
    });
  }

  async delete(id: number) {
    return this.prisma.customer.delete({
      where: {
        id,
      },
    });
  }

  /**
   * portalPaid(顧客ポータル有料フラグ)はここでは受け付けない。運営管理画面からの
   * AdminService.setPortalPaid()経由のみで変更できるようにし、通常の顧客編集からは
   * 変更できないようにしている。
   */
  async update(
    id: number,
    data: {
      customerName?: string;
      customerAddress?: string;
      phone?: string;
    },
  ) {
    const name = data.customerName?.trim();

    if (!name) {
      throw new BadRequestException('customerName is required.');
    }

    return this.prisma.customer.update({
      where: { id },
      data: {
        customerName: name,
        customerNameReading: await this.kanaReadingService.getReading(name),
        customerAddress: data.customerAddress?.trim() ?? '',
        phone: data.phone?.trim() ?? '',
      },
    });
  }

  /** LINE連携用のリンクコードを発行する(未発行なら新規作成、発行済みならそれを返す) */
  async ensureLineLinkToken(id: number) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      throw new BadRequestException('Customer not found');
    }

    // 全社共有のLINE公式アカウント経由でどの会社宛てのコードか判別できるよう、
    // 会社コードをトークンに埋め込む(GK-<companyCode>-XXXXXX)
    const companyCode = this.tenantContext.current()?.company.companyCode;

    if (customer.lineLinkToken?.startsWith(`GK-${companyCode}-`)) {
      return customer.lineLinkToken;
    }

    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    const token = companyCode ? `GK-${companyCode}-${suffix}` : `GK-${suffix}`;

    await this.prisma.customer.update({
      where: { id },
      data: { lineLinkToken: token },
    });

    return token;
  }

  async findByLineLinkToken(token: string) {
    return this.prisma.customer.findUnique({
      where: { lineLinkToken: token },
    });
  }

  async findByLineUserId(lineUserId: string) {
    return this.prisma.customer.findUnique({
      where: { lineUserId },
      include: {
        vehicles: {
          include: {
            serviceHistories: {
              include: { items: true },
              orderBy: { date: 'desc' },
              take: 3,
            },
          },
        },
      },
    });
  }

  /**
   * 連携コード送信によるLINE紐付け成功時に呼ぶ。lineLinkTokenをここで即座に無効化し、
   * 同じコードが後から再送されても別のLINEアカウントに付け替えられないようにする
   * (使い捨てコード化)。
   */
  async linkLineUser(customerId: number, lineUserId: string) {
    return this.prisma.customer.update({
      where: { id: customerId },
      data: { lineUserId, lineLinkToken: null },
    });
  }

  /** LINE連携を解除する。次回はまた新しい連携コードを発行し直す */
  async unlinkLineUser(customerId: number) {
    return this.prisma.customer.update({
      where: { id: customerId },
      data: {
        lineUserId: null,
        lineLinkToken: null,
      },
    });
  }

  async getLineMessages(customerId: number) {
    // フロント側はこの画面を開いている間、一定間隔でこのAPIをポーリングし続ける。
    // それをそのまま「今スタッフがこの顧客とのLINE画面を見ている」という在席シグナルとして使う
    await this.prisma.customer.update({
      where: { id: customerId },
      data: { lineScreenViewedAt: new Date() },
    });

    return this.prisma.lineMessage.findMany({
      where: { customerId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** ホーム画面のバッジ表示用。まだスタッフが確認していない(=readAtが無い)お客様からの受信数 */
  async countUnreadLineMessages() {
    return this.prisma.lineMessage.count({
      where: { direction: 'IN', readAt: null },
    });
  }

  /** スタッフがその顧客とのLINE画面を開いたら、その時点までの受信分を既読にする */
  async markLineMessagesRead(customerId: number) {
    await this.prisma.lineMessage.updateMany({
      where: { customerId, direction: 'IN', readAt: null },
      data: { readAt: new Date() },
    });

    return { ok: true };
  }

  /** スタッフが顧客のLINEへ手動でメッセージを送信する */
  async sendLineMessage(customerId: number, text: string) {
    const trimmed = text?.trim();

    if (!trimmed) {
      throw new BadRequestException('text is required.');
    }

    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new BadRequestException('Customer not found');
    }

    if (!customer.lineUserId) {
      throw new BadRequestException('この顧客はLINE連携されていません。');
    }

    await this.lineService.pushMessage(customer.lineUserId, [
      { type: 'text', text: trimmed },
    ]);

    // スタッフが直接対応を始めたので、しばらくAIの自動応答を止める。
    // 「担当者対応中」案内は今回の対応で未送信の状態に戻す(このスタッフ発言以降、また1回だけ送るため)
    await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        aiPausedUntil: new Date(Date.now() + STAFF_TAKEOVER_PAUSE_MINUTES * 60_000),
        aiPauseNoticeSentAt: null,
      },
    });

    return { ok: true };
  }
}