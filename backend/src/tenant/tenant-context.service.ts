// backend/src/tenant/tenant-context.service.ts

import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { PrismaClient } from '@prisma/client';
import type { CompanyAccount } from '.prisma/master-client';
import { TenantConnectionRegistry } from './tenant-connection-registry.service';

export interface TenantStore {
  company: CompanyAccount;
  prisma: PrismaClient;
}

@Injectable()
export class TenantContextService {
  private readonly storage = new AsyncLocalStorage<TenantStore>();

  constructor(private readonly registry: TenantConnectionRegistry) {}

  /** 指定した会社をテナントコンテキストとして確立した状態でfnを実行する */
  run<T>(company: CompanyAccount, fn: () => T | Promise<T>): T | Promise<T> {
    const prisma = this.registry.getClient(company.dbName);
    return this.storage.run({ company, prisma }, fn);
  }

  current(): TenantStore | undefined {
    return this.storage.getStore();
  }
}
