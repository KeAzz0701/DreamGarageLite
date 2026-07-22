// backend/src/tenant/tenant-connection-registry.service.ts

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/** 会社ごとのオペレーショナルDB(Customer/Vehicle等)への接続を、dbName単位でキャッシュする */
@Injectable()
export class TenantConnectionRegistry implements OnModuleDestroy {
  private readonly logger = new Logger(TenantConnectionRegistry.name);
  private readonly clients = new Map<string, PrismaClient>();

  private buildUrl(dbName: string): string {
    const base = process.env.DATABASE_URL;

    if (!base) {
      throw new Error('DATABASE_URL is not set');
    }

    const url = new URL(base);
    url.pathname = `/${dbName}`;
    return url.toString();
  }

  getClient(dbName: string): PrismaClient {
    const existing = this.clients.get(dbName);

    if (existing) return existing;

    const client = new PrismaClient({
      datasources: { db: { url: this.buildUrl(dbName) } },
    });

    this.clients.set(dbName, client);

    return client;
  }

  async onModuleDestroy() {
    await Promise.all(
      Array.from(this.clients.values()).map((client) =>
        client.$disconnect().catch((err) => this.logger.warn(String(err))),
      ),
    );
  }
}
