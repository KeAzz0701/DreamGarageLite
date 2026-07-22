// backend/src/auth/auth.service.ts

import { Injectable, UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { MasterPrismaService } from '../prisma/master-prisma.service';
import { SessionService } from './session.service';

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
}
