// backend/src/official-document/official-document.module.ts

import { Module } from '@nestjs/common';
import { OfficialDocumentController } from './official-document.controller';
import { OfficialDocumentService } from './official-document.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [OfficialDocumentController],
  providers: [OfficialDocumentService],
})
export class OfficialDocumentModule {}
