// backend/src/admin/admin.controller.ts

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Public } from '../auth/public.decorator';
import { AdminService } from './admin.service';
import { AdminSessionService, ADMIN_SESSION_COOKIE } from './admin-session.service';
import { AdminAuthGuard } from './admin-auth.guard';
import { LoginRateLimitGuard } from '../common/login-rate-limit.guard';

const isProd = process.env.NODE_ENV === 'production';

type AdminRequest = Request & { admin?: { adminUserId?: number; username?: string } };

@Public()
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly adminSessionService: AdminSessionService,
  ) {}

  @UseGuards(LoginRateLimitGuard)
  @Post('login')
  async login(
    @Body() body: { username?: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const adminUser = await this.adminService.login(body?.username, body?.password ?? '');

    const token = this.adminSessionService.sign(adminUser ?? undefined);

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
  async me(@Req() req: AdminRequest) {
    return { ok: true, username: req.admin?.username ?? null };
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

  @UseGuards(AdminAuthGuard)
  @Get('users')
  async listAdminUsers() {
    return this.adminService.listAdminUsers();
  }

  @UseGuards(AdminAuthGuard)
  @Post('users')
  async createAdminUser(@Body() body: { username: string; displayName?: string }) {
    return this.adminService.createAdminUser(body?.username, body?.displayName);
  }

  @UseGuards(AdminAuthGuard)
  @Post('users/:id/reset-password')
  async resetAdminUserPassword(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.resetAdminUserPassword(id);
  }

  @UseGuards(AdminAuthGuard)
  @Delete('users/:id')
  async deleteAdminUser(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AdminRequest,
  ) {
    return this.adminService.deleteAdminUser(id, req.admin?.adminUserId);
  }

  @UseGuards(AdminAuthGuard)
  @Get('api-keys')
  async listApiKeys() {
    return this.adminService.listApiKeys();
  }

  @UseGuards(AdminAuthGuard)
  @Post('api-keys')
  async addApiKey(@Body() body: { apiKey: string; tier?: string }) {
    return this.adminService.addApiKey(body?.apiKey, body?.tier);
  }

  @UseGuards(AdminAuthGuard)
  @Delete('api-keys/:id/assignment')
  async unassignApiKey(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.unassignApiKey(id);
  }

  @UseGuards(AdminAuthGuard)
  @Get('plan-change-requests')
  async listPendingPlanChangeRequests() {
    return this.adminService.listPendingPlanChangeRequests();
  }

  @UseGuards(AdminAuthGuard)
  @Post('plan-change-requests/:companyAccountId/:requestId/approve')
  async approvePlanChangeRequest(
    @Param('companyAccountId', ParseIntPipe) companyAccountId: number,
    @Param('requestId', ParseIntPipe) requestId: number,
  ) {
    return this.adminService.approvePlanChangeRequest(companyAccountId, requestId);
  }

  @UseGuards(AdminAuthGuard)
  @Post('plan-change-requests/:companyAccountId/:requestId/reject')
  async rejectPlanChangeRequest(
    @Param('companyAccountId', ParseIntPipe) companyAccountId: number,
    @Param('requestId', ParseIntPipe) requestId: number,
  ) {
    return this.adminService.rejectPlanChangeRequest(companyAccountId, requestId);
  }

  @UseGuards(AdminAuthGuard)
  @Get('error-reports')
  async listErrorReports() {
    return this.adminService.listErrorReports();
  }

  @UseGuards(AdminAuthGuard)
  @Get('portal-customers')
  async searchPortalCustomersAcrossCompanies(@Query('q') q?: string) {
    return this.adminService.searchPortalCustomersAcrossCompanies(q ?? '');
  }

  @UseGuards(AdminAuthGuard)
  @Get('companies/:id/portal-customers')
  async searchPortalCustomers(
    @Param('id', ParseIntPipe) id: number,
    @Query('q') q?: string,
  ) {
    return this.adminService.searchPortalCustomers(id, q ?? '');
  }

  @UseGuards(AdminAuthGuard)
  @Patch('companies/:id/portal-customers/:customerId')
  async setPortalPaid(
    @Param('id', ParseIntPipe) id: number,
    @Param('customerId', ParseIntPipe) customerId: number,
    @Body() body: { portalPaid: boolean },
  ) {
    return this.adminService.setPortalPaid(id, customerId, !!body?.portalPaid);
  }
}
