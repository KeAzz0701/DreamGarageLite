// backend/src/auth/auth.service.ts

import { Injectable, UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { MasterPrismaService } from '../prisma/master-prisma.service';
import { SessionService } from './session.service';

const STAFF_LOGIN_ERROR = '入室IDが正しくありません。';

@Injectable()
export class AuthService {
  constructor(
    private readonly masterPrisma: MasterPrismaService,
    private readonly sessionService: SessionService,
  ) {}

  async login(companyCode: string, password: string) {
    const company = await this.masterPrisma.companyAccount.findUnique({
      where: { companyCode: companyCode.trim().toUpperCase() },
    });

    if (!company || !company.isActive) {
      throw new UnauthorizedException(
        '会社コードまたはパスワードが正しくありません。',
      );
    }

    const passwordOk = await bcrypt.compare(password, company.passwordHash);

    if (!passwordOk) {
      throw new UnauthorizedException(
        '会社コードまたはパスワードが正しくありません。',
      );
    }

    const token = this.sessionService.sign({ companyAccountId: company.id });

    return { token, displayName: company.displayName };
  }

  /**
   * 運営管理画面で発行したQRコード(自動ログイン用の使い捨てトークン)からのログイン。
   * 会社パスワードそのものはURL・QRコードに含めず、有効期限付きのトークンだけを載せる
   */
  async loginWithAutoToken(token: string) {
    const record = await this.masterPrisma.companyAutoLoginToken.findUnique({
      where: { token },
      include: { companyAccount: true },
    });

    if (!record || !record.companyAccount.isActive || record.expiresAt < new Date()) {
      throw new UnauthorizedException(
        'このQRコード・リンクは無効か有効期限が切れています。会社コードとパスワードでログインしてください。',
      );
    }

    const sessionToken = this.sessionService.sign({
      companyAccountId: record.companyAccountId,
    });

    return { token: sessionToken, displayName: record.companyAccount.displayName };
  }

  /** 従業員のLINE入室(入室IDを手入力するパターン) */
  async loginWithStaffCode(code: string) {
    const staffLink = await this.masterPrisma.lineStaffLink.findUnique({
      where: { staffAccessCode: code.trim().toUpperCase() },
      include: { companyAccount: true },
    });

    if (!staffLink || !staffLink.companyAccount.isActive) {
      throw new UnauthorizedException(STAFF_LOGIN_ERROR);
    }

    await this.masterPrisma.lineStaffLink.update({
      where: { id: staffLink.id },
      data: { lastActiveAt: new Date() },
    });

    const token = this.sessionService.sign({
      companyAccountId: staffLink.companyAccountId,
      staffLinkId: staffLink.id,
      staffDisplayName: staffLink.displayName,
    });

    return {
      token,
      displayName: staffLink.companyAccount.displayName,
      staffDisplayName: staffLink.displayName,
    };
  }
}
