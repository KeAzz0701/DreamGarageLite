// backend/src/admin/admin.controller.ts

import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../auth/public.decorator';
import { AdminService } from './admin.service';
import { AdminSessionService, ADMIN_SESSION_COOKIE } from './admin-session.service';
import { AdminAuthGuard } from './admin-auth.guard';

const isProd = process.env.NODE_ENV === 'production';

@Public()
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly adminSessionService: AdminSessionService,
  ) {}

  @Post('login')
  async login(
    @Body() body: { password: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    this.adminService.login(body?.password ?? '');

    const token = this.adminSessionService.sign();

    res.cookie(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return { ok: true };
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(ADMIN_SESSION_COOKIE, { path: '/' });
    return { ok: true };
  }

  @UseGuards(AdminAuthGuard)
  @Get('me')
  async me() {
    return { ok: true };
  }

  @UseGuards(AdminAuthGuard)
  @Get('companies')
  async listCompanies() {
    return this.adminService.listCompanies();
  }

  @UseGuards(AdminAuthGuard)
  @Post('companies')
  async createCompany(@Body() body: { displayName: string; companyCode?: string }) {
    return this.adminService.createCompany(body.displayName, body.companyCode);
  }

  @UseGuards(AdminAuthGuard)
  @Patch('companies/:id')
  async updateCompany(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    return this.adminService.updateCompany(id, body);
  }

  @UseGuards(AdminAuthGuard)
  @Post('companies/:id/reset-password')
  async resetPassword(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.resetPassword(id);
  }
}
