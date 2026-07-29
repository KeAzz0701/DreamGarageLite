// backend/src/system-admin-line/system-admin-line.service.ts

import { Injectable } from '@nestjs/common';
import { MasterPrismaService } from '../prisma/master-prisma.service';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;
const CODE_TTL_MS = 10 * 60 * 1000;

function randomCode(): string {
  return Array.from(
    { length: CODE_LENGTH },
    () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)],
  ).join('');
}

/**
 * 運営者本人が「自分のLINE」を管理画面から正式に登録するための仕組み。
 * エラー報告などの運営者向け通知は、ここに登録された人にだけ送る。
 */
@Injectable()
export class SystemAdminLineService {
  private pending: { code: string; expiresAt: number } | null = null;

  constructor(private readonly masterPrisma: MasterPrismaService) {}

  /** 管理画面から呼ばれる。1回限りの登録コードを発行する(10分間有効) */
  generateCode(): { code: string; expiresAt: string } {
    const expiresAt = Date.now() + CODE_TTL_MS;
    this.pending = { code: randomCode(), expiresAt };
    return { code: this.pending.code, expiresAt: new Date(expiresAt).toISOString() };
  }

  /**
   * LINEで届いたテキストが発行済みの登録コードと一致すれば、そのLINEユーザーIDを
   * 運営者として登録してtrueを返す(呼び出し元で確認メッセージを返信する)。
   * 一致しなければfalseを返し、他の通常の処理に委ねる
   */
  async tryConsumeCode(lineUserId: string, text: string): Promise<boolean> {
    if (!this.pending) return false;

    if (Date.now() > this.pending.expiresAt) {
      this.pending = null;
      return false;
    }

    if (text.trim().toUpperCase() !== this.pending.code) return false;

    await this.masterPrisma.systemAdminLine.upsert({
      where: { lineUserId },
      update: {},
      create: { lineUserId },
    });

    this.pending = null;
    return true;
  }

  async list() {
    return this.masterPrisma.systemAdminLine.findMany({ orderBy: { registeredAt: 'asc' } });
  }

  async unregister(id: number) {
    await this.masterPrisma.systemAdminLine.delete({ where: { id } });
    return { ok: true };
  }

  async listLineUserIds(): Promise<string[]> {
    const rows = await this.masterPrisma.systemAdminLine.findMany();
    return rows.map((r) => r.lineUserId);
  }
}
