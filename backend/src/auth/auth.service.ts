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
