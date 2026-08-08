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
  @Post('notify')
  async notify(@Body() body: { message: string }) {
    return this.adminService.notifyAdmins(body.message);
  }

  @UseGuards(AdminAuthGuard)
  @Get('companies')
  async listCompanies() {
    return this.adminService.listCompanies();
  }

  @UseGuards(AdminAuthGuard)
  @Post('companies')
  async createCompany(
    @Body() body: { displayName: string; companyCode?: string; isDemo?: boolean },
  ) {
    return this.adminService.createCompany(body.displayName, body.companyCode, body.isDemo);
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

  /** QRコードで会社パスワードを自動入力/自動ログインさせるための使い捨てトークンを発行する */
  @UseGuards(AdminAuthGuard)
  @Post('companies/:id/auto-login-token')
  async generateAutoLoginToken(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.generateAutoLoginToken(id);
  }

  @UseGuards(AdminAuthGuard)
  @Delete('companies/:id')
  async deleteCompany(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteCompany(id);
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

  /** 誤操作からの復旧など、運営が管理画面から強制的にプランを変更する */
  @UseGuards(AdminAuthGuard)
  @Post('companies/:id/set-plan')
  async setCompanyPlan(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { plan: string; note?: string },
  ) {
    return this.adminService.setCompanyPlan(id, body.plan, body.note);
  }

  @UseGuards(AdminAuthGuard)
  @Get('companies/:id/plan-history')
  async getCompanyPlanHistory(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getCompanyPlanHistory(id);
  }

  /** モニター終了予告(30日後に自動でFREEへ移行) */
  @UseGuards(AdminAuthGuard)
  @Post('companies/:id/schedule-monitor-end')
  async scheduleMonitorEnd(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.scheduleMonitorEnd(id);
  }

  @UseGuards(AdminAuthGuard)
  @Post('companies/:id/cancel-monitor-end')
  async cancelMonitorEnd(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.cancelMonitorEnd(id);
  }

  @UseGuards(AdminAuthGuard)
  @Get('error-reports')
  async listErrorReports(@Query('resolved') resolved?: string) {
    return this.adminService.listErrorReports(resolved === 'true');
  }

  @UseGuards(AdminAuthGuard)
  @Patch('error-reports/:id/resolve')
  async resolveErrorReport(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { note?: string },
  ) {
    return this.adminService.resolveErrorReport(id, body?.note);
  }

  @UseGuards(AdminAuthGuard)
  @Patch('error-reports/:id/reopen')
  async reopenErrorReport(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.reopenErrorReport(id);
  }

  /** 自動診断エージェント(スケジュール実行)専用。コードは変更せず、原因と修正方針のテキストのみ登録する */
  @UseGuards(AdminAuthGuard)
  @Patch('error-reports/:id/diagnosis')
  async setErrorReportDiagnosis(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { diagnosisNote?: string; diagnosisSuggestedFix?: string },
  ) {
    return this.adminService.setErrorReportDiagnosis(
      id,
      body?.diagnosisNote ?? '',
      body?.diagnosisSuggestedFix ?? '',
    );
  }

  /** 運営者本人が診断結果を見て採用/却下を記録する。verdictを省略すると未判定に戻す */
  @UseGuards(AdminAuthGuard)
  @Patch('error-reports/:id/diagnosis-verdict')
  async setErrorReportDiagnosisVerdict(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { verdict?: 'APPROVED' | 'REJECTED' | null },
  ) {
    return this.adminService.setErrorReportDiagnosisVerdict(id, body?.verdict ?? null);
  }

  /** 運営者本人のLINE登録。1回限りの登録コードを発行し、それをLINEで送信すると連携される */
  @UseGuards(AdminAuthGuard)
  @Post('system-line/generate-code')
  generateSystemAdminLineCode() {
    return this.adminService.generateSystemAdminLineCode();
  }

  @UseGuards(AdminAuthGuard)
  @Get('system-line')
  async listSystemAdminLines() {
    return this.adminService.listSystemAdminLines();
  }

  @UseGuards(AdminAuthGuard)
  @Delete('system-line/:id')
  async unregisterSystemAdminLine(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.unregisterSystemAdminLine(id);
  }

}
