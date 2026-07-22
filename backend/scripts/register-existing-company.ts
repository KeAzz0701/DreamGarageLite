// backend/scripts/register-existing-company.ts
//
// 既存の運用DB(dream_garage_lite)を「会社1」としてマスターDB(会社ディレクトリ)へ
// 登録するワンショットスクリプト。データのコピーやDB名の変更は一切行わない。
//
// 実行方法:
//   cd backend
//   npx tsx scripts/register-existing-company.ts

import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient as OperationalPrismaClient } from '@prisma/client';
import { PrismaClient as MasterPrismaClient } from '.prisma/master-client';
import { messagingApi } from '@line/bot-sdk';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 紛らわしい文字(0/O/1/I/l)を除外
const PASSWORD_CHARS =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

function randomString(chars: string, length: number) {
  return Array.from(
    { length },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join('');
}

function dbNameFromUrl(url: string): string {
  return new URL(url).pathname.replace(/^\//, '');
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const masterUrl = process.env.DATABASE_URL_MASTER;

  if (!databaseUrl || !masterUrl) {
    throw new Error('DATABASE_URL / DATABASE_URL_MASTER が設定されていません。');
  }

  const dbName = dbNameFromUrl(databaseUrl);

  const operationalPrisma = new OperationalPrismaClient();
  const masterPrisma = new MasterPrismaClient();

  try {
    const company = await operationalPrisma.company.findFirst();

    if (!company) {
      throw new Error(
        '運用DBに会社情報が見つかりません。先に会社情報を登録してください。',
      );
    }

    const existing = await masterPrisma.companyAccount.findUnique({
      where: { dbName },
    });

    if (existing) {
      console.log(
        `既にマスターDBへ登録済みです(companyCode: ${existing.companyCode})。何もしませんでした。`,
      );
      return;
    }

    const companyCode = randomString(CODE_CHARS, 8);
    const password = randomString(PASSWORD_CHARS, 12);
    const passwordHash = await bcrypt.hash(password, 10);

    let lineDestinationUserId: string | undefined;

    if (process.env.LINE_CHANNEL_ACCESS_TOKEN) {
      try {
        const lineClient = new messagingApi.MessagingApiClient({
          channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
        });
        const botInfo = await lineClient.getBotInfo();
        lineDestinationUserId = botInfo.userId;
      } catch (err) {
        console.warn(
          `LINEボット情報の取得に失敗しました(LINE連携は後で設定できます): ${err}`,
        );
      }
    }

    await masterPrisma.companyAccount.create({
      data: {
        companyCode,
        passwordHash,
        displayName: company.companyName || company.name,
        dbName,
        lineChannelId: process.env.LINE_CHANNEL_ID || undefined,
        lineChannelSecret: process.env.LINE_CHANNEL_SECRET || undefined,
        lineChannelAccessToken:
          process.env.LINE_CHANNEL_ACCESS_TOKEN || undefined,
        lineDestinationUserId,
      },
    });

    console.log('');
    console.log('====================================');
    console.log(' 会社ログイン情報を発行しました');
    console.log('====================================');
    console.log(`会社コード: ${companyCode}`);
    console.log(`パスワード: ${password}`);
    console.log('====================================');
    console.log('この情報は今しか表示されません。安全な場所に控えてください。');
    console.log('');
  } finally {
    await operationalPrisma.$disconnect();
    await masterPrisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
