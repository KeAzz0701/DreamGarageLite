// backend/src/announcement/announcement.controller.ts

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { AnnouncementService } from './announcement.service';

@Controller('announcements')
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {}

  @Get()
  async list() {
    return this.announcementService.list();
  }

  @Post()
  async create(@Body() body: { title: string; body: string; publishAt?: string | null }) {
    return this.announcementService.create(body.title, body.body, body.publishAt);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { title: string; body: string; publishAt?: string | null },
  ) {
    return this.announcementService.update(id, body.title, body.body, body.publishAt);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.announcementService.delete(id);
  }
}
