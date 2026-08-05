// backend/src/admin/admin.service.ts

import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { Client } from 'pg';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MasterPrismaService } from '../prisma/master-prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { LicenseService } from '../license/license.service';
import { ErrorReportService } from '../error-report/error-report.service';
import { SystemAdminLineService } from '../system-admin-line/system-admin-line.service';
import { getEffectivePlanLimits, getTrialDaysRemaining } from '../common/plans';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const DOCUMENT_PREFIX_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const PASSWORD_CHARS =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
const LICENSE_KEY_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function randomString(chars: string, length: number) {
  return Array.from(
    { length },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join('');
}

function buildUrl(base: string, dbName: string): string {
  const url = new URL(base);
  url.pathname = `/${dbName}`;
  return url.toString();
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let mismatch = 0;

  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return mismatch === 0;
}

@Injectable()
export class AdminService {
  constructor(
    private readonly masterPrisma: MasterPrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly licenseService: LicenseService,
    private readonly prisma: PrismaService,
    private readonly errorReportService: ErrorReportService,
    private readonly systemAdminLineService: SystemAdminLineService,
  ) {}

  async listErrorReports(resolved = false) {
    return this.errorReportService.list(resolved);
  }

  generateSystemAdminLineCode() {
    return this.systemAdminLineService.generateCode();
  }

  async listSystemAdminLines() {
    return this.systemAdminLineService.list();
  }

  async unregisterSystemAdminLine(id: number) {
    return this.systemAdminLineService.unregister(id);
  }

  async resolveErrorReport(id: number, note?: string) {
    return this.errorReportService.resolve(id, note);
  }

  async reopenErrorReport(id: number) {
    return this.errorReportService.reopen(id);
  }

  async setErrorReportDiagnosis(id: number, diagnosisNote: string, diagnosisSuggestedFix: string) {
    return this.errorReportService.setDiagnosis(id, diagnosisNote, diagnosisSuggestedFix);
  }

  async setErrorReportDiagnosisVerdict(id: number, verdict: 'APPROVED' | 'REJECTED' | null) {
    return this.errorReportService.setDiagnosisVerdict(id, verdict);
  }

  /**
   * ユーザー名が指定されていれば担当者アカウントでの個別ログイン。
   * ユーザー名が空の場合は、担当者アカウントが1件も無い時に限り
   * ADMIN_PASSWORD(共有パスワード)での初回ブートストラップログインを許可する。
   */
  async login(
    username: string | undefined,
    password: string,
  ): Promise<{ id: number; username: string } | null> {
    const trimmedUsername = username?.trim();

    if (trimmedUsername) {
      const user = await this.masterPrisma.adminUser.findUnique({
        where: { username: trimmedUsername },
      });

      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        throw new UnauthorizedException('ユーザー名またはパスワードが正しくありません。');
      }

      return { id: user.id, username: user.username };
    }

    const adminUserCount = await this.masterPrisma.adminUser.count();

    if (adminUserCount > 0) {
      throw new UnauthorizedException('担当者アカウントのユーザー名とパスワードでログインしてください。');
    }

    const expected = process.env.ADMIN_PASSWORD;

    if (!expected || !password || !timingSafeEqual(password, expected)) {
      throw new UnauthorizedException('パスワードが正しくありません。');
    }

    return null;
  }

  async listAdminUsers() {
    const users = await this.masterPrisma.adminUser.findMany({
      orderBy: { createdAt: 'asc' },
    });

    return users.map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      createdAt: u.createdAt,
    }));
  }

  async createAdminUser(username: string, displayName?: string) {
    const trimmed = username?.trim();

    if (!trimmed) {
      throw new BadRequestException('ユーザー名を入力してください。');
    }

    const existing = await this.masterPrisma.adminUser.findUnique({
      where: { username: trimmed },
    });

    if (existing) {
      throw new BadRequestException(`ユーザー名 "${trimmed}" は既に使用されています。`);
    }

    const password = randomString(PASSWORD_CHARS, 12);
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.masterPrisma.adminUser.create({
      data: {
        username: trimmed,
        passwordHash,
        displayName: displayName?.trim() || undefined,
      },
    });

    return { username: user.username, password };
  }

  async resetAdminUserPassword(id: number) {
    const password = randomString(PASSWORD_CHARS, 12);
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.masterPrisma.adminUser.update({
      where: { id },
      data: { passwordHash },
    });

    return { username: user.username, password };
  }

  async deleteAdminUser(id: number, currentAdminUserId?: number) {
    if (currentAdminUserId === id) {
      throw new BadRequestException('ログイン中の自分自身のアカウントは削除できません。');
    }

    await this.masterPrisma.adminUser.delete({ where: { id } });

    return { ok: true };
  }

  async listApiKeys() {
    const keys = await this.masterPrisma.apiKeyPool.findMany({
      include: { companyAccount: true },
      orderBy: { createdAt: 'asc' },
    });

    return keys.map((k) => ({
      id: k.id,
      provider: k.provider,
      tier: k.tier,
      maskedKey: `••••${k.apiKey.slice(-4)}`,
      assignedCompanyName: k.companyAccount?.displayName ?? null,
      assignedAt: k.assignedAt,
      createdAt: k.createdAt,
    }));
  }

  async addApiKey(apiKey: string, tier: string = 'FREE') {
    const trimmed = apiKey?.trim();

    if (!trimmed) {
      throw new BadRequestException('APIキーを入力してください。');
    }

    const existing = await this.masterPrisma.apiKeyPool.findUnique({
      where: { apiKey: trimmed },
    });

    if (existing) {
      throw new BadRequestException('このAPIキーは既に登録されています。');
    }

    await this.masterPrisma.apiKeyPool.create({
      data: { apiKey: trimmed, tier: tier === 'PAID' ? 'PAID' : 'FREE' },
    });

    return { ok: true };
  }

  async unassignApiKey(id: number) {
    await this.masterPrisma.apiKeyPool.update({
      where: { id },
      data: { companyAccountId: null, assignedAt: null },
    });

    return { ok: true };
  }

  async listCompanies() {
    const companies = await this.masterPrisma.companyAccount.findMany({
      orderBy: { createdAt: 'asc' },
    });

    const results: {
      id: number;
      companyCode: string;
      displayName: string;
      dbName: string;
      isActive: boolean;
      currentPlan: string | null;
      lineConnected: boolean;
      trialDaysRemaining: number | null;
      createdAt: Date;
      updatedAt: Date;
    }[] = [];

    for (const c of companies) {
      // 無料お試しの残り日数は各社のテナントDB(License)側にしか無いため、会社ごとに引きに行く
      const trialDaysRemaining = await this.tenantContext.run(c, async () => {
        const license = await this.prisma.license.findFirst();

        if (!license) return null;

        return getTrialDaysRemaining(license.plan, license.activatedAt, license.hasUsedPaidPlan);
      });

      // passwordHashやLINEのシークレット/アクセストークンは一覧に出さない(管理画面のブラウザにも残さない)
      results.push({
        id: c.id,
        companyCode: c.companyCode,
        displayName: c.displayName,
        dbName: c.dbName,
        isActive: c.isActive,
        currentPlan: c.currentPlan,
        lineConnected: Boolean(c.lineChannelAccessToken),
        trialDaysRemaining,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      });
    }

    return results;
  }

  /** 全社を横断して、承認待ちのプラン変更申請を集める */
  async listPendingPlanChangeRequests() {
    const companies = await this.masterPrisma.companyAccount.findMany({
      where: { isActive: true },
    });

    const results: {
      companyAccountId: number;
      companyName: string;
      requestId: number;
      targetPlan: string;
      paymentMethod: string;
      requestedAt: Date;
    }[] = [];

    for (const company of companies) {
      const requests = await this.tenantContext.run(company, async () => {
        const tenantCompany = await this.prisma.company.findFirst();
        if (!tenantCompany) return [];

        const all = await this.licenseService.listPlanChangeRequests(tenantCompany.id);
        return all.filter((r) => r.status === 'PENDING');
      });

      for (const r of requests) {
        results.push({
          companyAccountId: company.id,
          companyName: company.displayName,
          requestId: r.id,
          targetPlan: r.targetPlan,
          paymentMethod: r.paymentMethod,
          requestedAt: r.requestedAt,
        });
      }
    }

    return results;
  }

  /** 入金確認後、運営側の操作でのみプラン変更申請を承認できる(会社側からは呼べない) */
  async approvePlanChangeRequest(companyAccountId: number, requestId: number) {
    const company = await this.masterPrisma.companyAccount.findUnique({
      where: { id: companyAccountId },
    });

    if (!company) {
      throw new BadRequestException('会社が見つかりません。');
    }

    return this.tenantContext.run(company, () =>
      this.licenseService.approvePlanChangeRequest(requestId),
    );
  }

  async rejectPlanChangeRequest(companyAccountId: number, requestId: number) {
    const company = await this.masterPrisma.companyAccount.findUnique({
      where: { id: companyAccountId },
    });

    if (!company) {
      throw new BadRequestException('会社が見つかりません。');
    }

    return this.tenantContext.run(company, () =>
      this.licenseService.rejectPlanChangeRequest(requestId),
    );
  }

  async resetPassword(id: number) {
    const password = randomString(PASSWORD_CHARS, 12);
    const passwordHash = await bcrypt.hash(password, 10);

    const company = await this.masterPrisma.companyAccount.update({
      where: { id },
      data: { passwordHash },
    });

    return { companyCode: company.companyCode, password };
  }

  /**
   * 会社の自動ログインQRコード用トークンを発行する(24時間有効)。会社パスワード自体は
   * QRコード・URLに含めず、この使い捨てトークンをスキャンすると自動でログインできるようにする
   */
  async generateAutoLoginToken(companyAccountId: number) {
    const company = await this.masterPrisma.companyAccount.findUnique({
      where: { id: companyAccountId },
    });

    if (!company) {
      throw new BadRequestException('会社が見つかりませんでした。');
    }

    const token = randomBytes(24).toString('base64url');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.masterPrisma.companyAutoLoginToken.create({
      data: { token, companyAccountId, expiresAt },
    });

    return { token, expiresAt: expiresAt.toISOString() };
  }

  async updateCompany(
    id: number,
    data: {
      displayName?: string;
      isActive?: boolean;
      lineChannelId?: string;
      lineChannelSecret?: string;
      lineChannelAccessToken?: string;
      lineDestinationUserId?: string;
    },
  ) {
    const company = await this.masterPrisma.companyAccount.update({
      where: { id },
      data,
    });

    return {
      id: company.id,
      companyCode: company.companyCode,
      displayName: company.displayName,
      dbName: company.dbName,
      isActive: company.isActive,
      lineConnected: Boolean(company.lineChannelAccessToken),
    };
  }

  /**
   * 会社を完全に削除する(テナントDBごと物理削除。復元不可)。
   * 誤操作防止のため、先に無効化されている会社しか削除できないようにしている。
   */
  async deleteCompany(id: number) {
    const company = await this.masterPrisma.companyAccount.findUnique({
      where: { id },
    });

    if (!company) {
      throw new BadRequestException('会社が見つかりません。');
    }

    if (company.isActive) {
      throw new BadRequestException(
        '有効な会社は削除できません。先に無効化してから削除してください。',
      );
    }

    // マスターDB側の関連レコードは外部キー制約があるため、会社本体より先に整理する
    // (APIキーは削除せず、プールに戻して他社が使えるようにする)
    await this.masterPrisma.apiKeyPool.updateMany({
      where: { companyAccountId: id },
      data: { companyAccountId: null, assignedAt: null },
    });
    await this.masterPrisma.lineCompanyLink.deleteMany({ where: { companyAccountId: id } });
    await this.masterPrisma.lineStaffLink.deleteMany({ where: { companyAccountId: id } });
    await this.masterPrisma.errorReport.deleteMany({ where: { companyAccountId: id } });

    await this.masterPrisma.companyAccount.delete({ where: { id } });

    // テナントDB本体を削除する。既存の接続が残っていると失敗するため、先に強制切断する
    const baseUrl = process.env.DATABASE_URL;

    if (!baseUrl) {
      throw new Error('DATABASE_URL is not set');
    }

    const adminClient = new Client({ connectionString: baseUrl });
    await adminClient.connect();

    try {
      await adminClient.query(
        `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
        [company.dbName],
      );
      await adminClient.query(`DROP DATABASE IF EXISTS "${company.dbName}"`);
    } finally {
      await adminClient.end();
    }

    return { ok: true };
  }

  async createCompany(displayName: string, explicitCode?: string) {
    if (!displayName?.trim()) {
      throw new BadRequestException('表示名(会社名)を入力してください。');
    }

    const baseUrl = process.env.DATABASE_URL;

    if (!baseUrl) {
      throw new BadRequestException('DATABASE_URL が設定されていません。');
    }

    const companyCode = (explicitCode?.trim() || randomString(CODE_CHARS, 8)).toUpperCase();

    const existing = await this.masterPrisma.companyAccount.findUnique({
      where: { companyCode },
    });

    if (existing) {
      throw new BadRequestException(`会社コード "${companyCode}" は既に使用されています。`);
    }

    const dbName = `dream_garage_${companyCode.toLowerCase()}`;

    const adminClient = new Client({ connectionString: baseUrl });
    await adminClient.connect();

    try {
      await adminClient.query(`CREATE DATABASE "${dbName}"`);
    } finally {
      await adminClient.end();
    }

    const newDbUrl = buildUrl(baseUrl, dbName);

    execSync('npx prisma migrate deploy', {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: newDbUrl },
      stdio: 'pipe',
    });

    // 新しいテナントDBに会社情報の初期行を作る(これが無いとLicenseGuard等が
    // 「会社情報が見つかりません」で全機能を弾いてしまう)
    const tenantPrisma = new PrismaClient({
      datasources: { db: { url: newDbUrl } },
    });

    try {
      const tenantCompany = await tenantPrisma.company.create({
        data: {
          name: displayName.trim(),
          companyName: displayName.trim(),
          documentPrefix: randomString(DOCUMENT_PREFIX_CHARS, 2),
        },
      });

      // 管理画面から作った会社はすぐ使える状態にしておく(手動でのライセンスキー入力は不要)
      const licenseKey = `DG-${randomString(LICENSE_KEY_CHARS, 4)}-${randomString(LICENSE_KEY_CHARS, 4)}`;

      await tenantPrisma.license.create({
        data: {
          companyId: tenantCompany.id,
          licenseKey,
          status: 'ACTIVE',
          activatedAt: new Date(),
          plan: 'FREE',
          maxOcrPerMonth: getEffectivePlanLimits('FREE', new Date()).maxOcrPerMonth,
          usedOcr: 0,
          usedOcrMonth: currentMonthKey(),
        },
      });

    } finally {
      await tenantPrisma.$disconnect();
    }

    const password = randomString(PASSWORD_CHARS, 12);
    const passwordHash = await bcrypt.hash(password, 10);

    const companyAccount = await this.masterPrisma.companyAccount.create({
      data: {
        companyCode,
        passwordHash,
        displayName: displayName.trim(),
        dbName,
      },
    });

    // APIキーは会社ごとにDBが分かれるため、マスターDBの共有プールから割り当てる
    // (在庫が無ければ割り当てずスキップし、GeminiService側の共通フォールバックキーを使う)
    const unassignedKey = await this.masterPrisma.apiKeyPool.findFirst({
      where: { companyAccountId: null, tier: 'FREE' },
      orderBy: { createdAt: 'asc' },
    });

    if (unassignedKey) {
      await this.masterPrisma.apiKeyPool.update({
        where: { id: unassignedKey.id },
        data: { companyAccountId: companyAccount.id, assignedAt: new Date() },
      });
    }

    return { companyCode, password, dbName };
  }
}
