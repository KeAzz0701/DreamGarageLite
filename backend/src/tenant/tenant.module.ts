// backend/src/tenant/tenant.module.ts

import { Global, Module } from '@nestjs/common';
import { MasterPrismaService } from '../prisma/master-prisma.service';
import { TenantConnectionRegistry } from './tenant-connection-registry.service';
import { TenantContextService } from './tenant-context.service';

@Global()
@Module({
  providers: [MasterPrismaService, TenantConnectionRegistry, TenantContextService],
  exports: [MasterPrismaService, TenantConnectionRegistry, TenantContextService],
})
export class TenantModule {}
