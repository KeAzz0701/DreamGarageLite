import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getEffectivePlanLimits } from '../common/plans';

interface FindOrCreateCustomerDto {
  customerName: string;
  customerAddress?: string;
  ownerName?: string;
  ownerAddress?: string;
  phone?: string;
}

@Injectable()
export class CustomerService {
  constructor(private readonly prisma: PrismaService) {}

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
        },
      });
    }

    // 新規登録時のみ、プランの顧客登録上限をチェックする
    const license = await this.prisma.license.findFirst();

    if (license) {
      const limits = getEffectivePlanLimits(license.plan, license.activatedAt);

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

    if (customer.lineLinkToken) {
      return customer.lineLinkToken;
    }

    const token = `GK-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

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

  async linkLineUser(customerId: number, lineUserId: string) {
    return this.prisma.customer.update({
      where: { id: customerId },
      data: { lineUserId },
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
}