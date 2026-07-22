// backend/src/auth/auth.controller.ts

import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { SESSION_COOKIE } from './session.service';
import { TenantContextService } from '../tenant/tenant-context.service';

const isProd = process.env.NODE_ENV === 'production';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tenantContext: TenantContextService,
  ) {}

  @Public()
  @Post('login')
  async login(
    @Body() body: { companyCode: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, displayName } = await this.authService.login(
      body?.companyCode ?? '',
      body?.password ?? '',
    );

    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return { displayName };
  }

  @Public()
  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    return { ok: true };
  }

  @Get('me')
  async me() {
    const company = this.tenantContext.current()!.company;

    return {
      displayName: company.displayName,
      companyCode: company.companyCode,
    };
  }
}
