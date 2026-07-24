// backend/src/admin/admin.service.ts

import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { execSync } from 'node:child_process';
import { Client } from 'pg';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { MasterPrismaService } from '../prisma/master-prisma.service';
import { getEffectivePlanLimits } from '../common/plans';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
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
  constructor(private readonly masterPrisma: MasterPrismaService) {}

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

    // passwordHashやLINEのシークレット/アクセストークンは一覧に出さない(管理画面のブラウザにも残さない)
    return companies.map((c) => ({
      id: c.id,
      companyCode: c.companyCode,
      displayName: c.displayName,
      dbName: c.dbName,
      isActive: c.isActive,
      lineConnected: Boolean(c.lineChannelAccessToken),
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
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
