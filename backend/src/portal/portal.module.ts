// backend/src/portal/portal.module.ts

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LineModule } from '../line/line.module';
import { LicenseModule } from '../license/license.module';
import { CompetitorEstimateModule } from '../competitor-estimate/competitor-estimate.module';
import { PortalService } from './portal.service';
import { PortalSessionService } from './portal-session.service';
import { PortalAuthGuard } from './portal-auth.guard';
import { PortalAuthController } from './portal-auth.controller';
import { PortalController } from './portal.controller';

@Module({
  imports: [PrismaModule, LineModule, LicenseModule, CompetitorEstimateModule],
  controllers: [PortalAuthController, PortalController],
  providers: [PortalService, PortalSessionService, PortalAuthGuard],
  exports: [PortalSessionService],
})
export class PortalModule {}
