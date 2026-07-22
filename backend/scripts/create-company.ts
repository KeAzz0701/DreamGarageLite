// backend/scripts/create-company.ts
//
// 新しい会社を追加するスクリプト(今回のセッションでは未実行。仕組みのみ)。
// (1) 専用のPostgreSQLデータベースを作成
// (2) そのDBへ運用スキーマのマイグレーションを適用
// (3) ログイン用の会社コード・パスワードを発行し、マスターDBに登録
//
// LINE公式アカウントの作成はLINE Developersコンソールでの手動作業が必要なため、
// このスクリプトはLINEチャンネル情報を空のまま作成する。あとで管理者が
// マスターDBのCompanyAccount行を更新すること。
//
// 実行方法:
//   cd backend
//   npx tsx scripts/create-company.ts "表示名(会社名)" [会社コード]
//
// 例:
//   npx tsx scripts/create-company.ts "山田自動車整備"
//   npx tsx scripts/create-company.ts "山田自動車整備" YAMADA01

import 'dotenv/config';
import { execSync } from 'node:child_process';
import { Client } from 'pg';
import bcrypt from 'bcrypt';
import { PrismaClient as MasterPrismaClient } from '.prisma/master-client';

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

async function main() {
  const displayName = process.argv[2];
  const explicitCode = process.argv[3];

  if (!displayName) {
    console.error(
      '使い方: npx tsx scripts/create-company.ts "表示名(会社名)" [会社コード]',
    );
    process.exit(1);
  }

  const baseUrl = process.env.DATABASE_URL;
  const masterUrl = process.env.DATABASE_URL_MASTER;

  if (!baseUrl || !masterUrl) {
    throw new Error('DATABASE_URL / DATABASE_URL_MASTER が設定されていません。');
  }

  const companyCode = (explicitCode || randomString(CODE_CHARS, 8)).toUpperCase();
  const dbName = `dream_garage_${companyCode.toLowerCase()}`;

  const masterPrisma = new MasterPrismaClient();

  try {
    const existing = await masterPrisma.companyAccount.findUnique({
      where: { companyCode },
    });

    if (existing) {
      throw new Error(`会社コード "${companyCode}" は既に使用されています。`);
    }

    // (1) 専用データベースを作成
    const adminClient = new Client({ connectionString: baseUrl });
    await adminClient.connect();

    try {
      await adminClient.query(`CREATE DATABASE "${dbName}"`);
      console.log(`データベース "${dbName}" を作成しました。`);
    } finally {
      await adminClient.end();
    }

    // (2) 運用スキーマのマイグレーションを適用
    const newDbUrl = buildUrl(baseUrl, dbName);

    execSync('npx prisma migrate deploy', {
      cwd: __dirname + '/..',
      env: { ...process.env, DATABASE_URL: newDbUrl },
      stdio: 'inherit',
    });

    // (3) ログイン情報を発行してマスターDBへ登録
    const password = randomString(PASSWORD_CHARS, 12);
    const passwordHash = await bcrypt.hash(password, 10);

    await masterPrisma.companyAccount.create({
      data: {
        companyCode,
        passwordHash,
        displayName,
        dbName,
      },
    });

    console.log('');
    console.log('====================================');
    console.log(` 会社「${displayName}」を作成しました`);
    console.log('====================================');
    console.log(`会社コード: ${companyCode}`);
    console.log(`パスワード: ${password}`);
    console.log(`データベース: ${dbName}`);
    console.log('====================================');
    console.log(
      'LINE公式アカウントを別途作成し、マスターDBのCompanyAccount行に' +
        'lineChannelId / lineChannelSecret / lineChannelAccessToken / ' +
        'lineDestinationUserIdを設定してください。',
    );
    console.log('');
  } finally {
    await masterPrisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
