// backend/src/admin/admin.service.ts

import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { execSync } from 'node:child_process';
import { Client } from 'pg';
import bcrypt from 'bcrypt';
import { MasterPrismaService } from '../prisma/master-prisma.service';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PASSWORD_CHARS =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

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

  login(password: string) {
    const expected = process.env.ADMIN_PASSWORD;

    if (!expected || !password || !timingSafeEqual(password, expected)) {
      throw new UnauthorizedException('パスワードが正しくありません。');
    }
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

    const password = randomString(PASSWORD_CHARS, 12);
    const passwordHash = await bcrypt.hash(password, 10);

    await this.masterPrisma.companyAccount.create({
      data: {
        companyCode,
        passwordHash,
        displayName: displayName.trim(),
        dbName,
      },
    });

    return { companyCode, password, dbName };
  }
}
