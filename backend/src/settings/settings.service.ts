// backend/src/settings/settings.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async get(companyId: number) {
    return this.prisma.settings.findUnique({
      where: {
        companyId,
      },
    });
  }

  async create(companyId: number) {
    return this.prisma.settings.create({
      data: {
        companyId,

        theme: 'light',
      },
    });
  }

  async update(companyId: number, data: any) {
    return this.prisma.settings.upsert({
      where: {
        companyId,
      },
      update: {
        ...data,
      },
      create: {
        companyId,
        ...data,
      },
    });
  }

  async initialize(companyId: number) {
    const settings = await this.prisma.settings.findUnique({
      where: {
        companyId,
      },
    });

    if (settings) {
      return settings;
    }

    return this.create(companyId);
  }
}