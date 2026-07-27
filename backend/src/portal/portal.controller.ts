// backend/src/portal/portal.controller.ts

import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { Public } from '../auth/public.decorator';
import { PortalService } from './portal.service';
import { PortalAuthGuard } from './portal-auth.guard';
import { PortalSessionPayload } from './portal-session.service';

type PortalRequest = Request & { portalSession?: PortalSessionPayload };

@Public()
@UseGuards(PortalAuthGuard)
@Controller('portal')
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  @Get('me')
  async me(@Req() req: PortalRequest) {
    return this.portalService.getMe(req.portalSession!.tenantCustomerId);
  }

  @Get('service-history')
  async serviceHistory(@Req() req: PortalRequest) {
    return this.portalService.getServiceHistory(req.portalSession!.tenantCustomerId);
  }

  @Get('maintenance-recommendations')
  async maintenanceRecommendations(@Req() req: PortalRequest) {
    return this.portalService.getMaintenanceRecommendations(req.portalSession!.tenantCustomerId);
  }

  @Get('tire-wear')
  async tireWear(@Req() req: PortalRequest) {
    return this.portalService.getTireWear(req.portalSession!.tenantCustomerId);
  }

  @Post('competitor-estimate')
  @UseInterceptors(FileInterceptor('file'))
  async createCompetitorEstimate(
    @UploadedFile() file: Express.Multer.File,
    @Body('vehicleId', ParseIntPipe) vehicleId: number,
    @Body('sharedWithShop') sharedWithShop: string,
    @Req() req: PortalRequest,
  ) {
    return this.portalService.createCompetitorEstimate(
      req.portalSession!.tenantCustomerId,
      vehicleId,
      file,
      sharedWithShop === 'true',
    );
  }

  @Get('competitor-estimate')
  async listCompetitorEstimates(@Req() req: PortalRequest) {
    return this.portalService.listCompetitorEstimates(req.portalSession!.tenantCustomerId);
  }

  @Get('competitor-estimate/:id/image')
  async getCompetitorEstimateImage(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: PortalRequest,
  ) {
    return this.portalService.getCompetitorEstimateImage(req.portalSession!.tenantCustomerId, id);
  }
}
