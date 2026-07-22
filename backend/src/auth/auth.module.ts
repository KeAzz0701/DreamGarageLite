// backend/src/auth/auth.module.ts

import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { TenantGuard } from './tenant.guard';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionService,
    { provide: APP_GUARD, useClass: TenantGuard },
  ],
  exports: [SessionService],
})
export class AuthModule {}
