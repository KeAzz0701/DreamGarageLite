// backend/src/prisma/master-prisma.service.ts

import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '.prisma/master-client';

/** 会社ディレクトリ(CompanyAccount)を持つマスターDB専用のPrismaClient。テナント分岐はしない */
@Injectable()
export class MasterPrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
