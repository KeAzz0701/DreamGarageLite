// backend/src/announcement/announcement.service.ts

import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnnouncementService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.announcement.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async latest(limit = 3) {
    return this.prisma.announcement.findMany({
      where: { OR: [{ publishAt: null }, { publishAt: { lte: new Date() } }] },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async create(title: string, body: string, publishAt?: string | null) {
    if (!title?.trim() || !body?.trim()) {
      throw new BadRequestException('タイトルと本文は必須です。');
    }

    return this.prisma.announcement.create({
      data: {
        title: title.trim(),
        body: body.trim(),
        publishAt: publishAt ? new Date(publishAt) : null,
      },
    });
  }

  async update(id: number, title: string, body: string, publishAt?: string | null) {
    if (!title?.trim() || !body?.trim()) {
      throw new BadRequestException('タイトルと本文は必須です。');
    }

    return this.prisma.announcement.update({
      where: { id },
      data: {
        title: title.trim(),
        body: body.trim(),
        publishAt: publishAt ? new Date(publishAt) : null,
      },
    });
  }

  async delete(id: number) {
    return this.prisma.announcement.delete({ where: { id } });
  }
}
