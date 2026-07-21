// backend/src/company/company.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CompanyService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async getCompany() {
    return this.prisma.company.findFirst({
      include: {
        license: true,
        settings: true,
      },
    });
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