// backend/src/error-report/error-report.module.ts

import { Module } from '@nestjs/common';
import { LineModule } from '../line/line.module';
import { ErrorReportController } from './error-report.controller';
import { ErrorReportService } from './error-report.service';

@Module({
  imports: [LineModule],
  controllers: [ErrorReportController],
  providers: [ErrorReportService],
  exports: [ErrorReportService],
})
export class ErrorReportModule {}
