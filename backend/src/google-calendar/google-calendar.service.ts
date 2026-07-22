// backend/src/google-calendar/google-calendar.service.ts

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { google } from 'googleapis';
import { PrismaService } from '../prisma/prisma.service';

const CALENDAR_SCOPES = ['https://www.googleapis.com/auth/calendar'];

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);

  constructor(private readonly prisma: PrismaService) {}

  isConfigured(): boolean {
    return Boolean(
      process.env.GOOGLE_CALENDAR_CLIENT_ID &&
        process.env.GOOGLE_CALENDAR_CLIENT_SECRET &&
        process.env.GOOGLE_CALENDAR_REDIRECT_URI,
    );
  }

  private createOAuthClient() {
    return new google.auth.OAuth2(
      process.env.GOOGLE_CALENDAR_CLIENT_ID,
      process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
      process.env.GOOGLE_CALENDAR_REDIRECT_URI,
    );
  }

  getAuthUrl(): string {
    return this.createOAuthClient().generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: CALENDAR_SCOPES,
    });
  }

  /** OAuth同意後のコールバック。専用カレンダーを自動作成し、認証情報を保存する */
  async handleOAuthCallback(code: string) {
    const company = await this.prisma.company.findFirst();

    if (!company) {
      throw new BadRequestException('Company not found');
    }

    const client = this.createOAuthClient();
    const { tokens } = await client.getToken(code);

    const existing = await this.prisma.googleCalendarCredential.findUnique({
      where: { companyId: company.id },
    });

    const refreshToken = tokens.refresh_token ?? existing?.refreshToken;

    if (!refreshToken) {
      throw new BadRequestException(
        'Googleからのリフレッシュトークン取得に失敗しました。もう一度連携をお試しください。',
      );
    }

    client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: client });
    const userinfo = await oauth2.userinfo.get();

    let calendarId = existing?.calendarId;

    if (!calendarId) {
      const calendar = google.calendar({ version: 'v3', auth: client });

      const created = await calendar.calendars.insert({
        requestBody: {
          summary: `ガレージカルテ予約 - ${company.companyName ?? company.name}`,
          timeZone: 'Asia/Tokyo',
        },
      });

      calendarId = created.data.id ?? undefined;
    }

    await this.prisma.googleCalendarCredential.upsert({
      where: { companyId: company.id },
      update: {
        calendarId,
        refreshToken,
        accessToken: tokens.access_token,
        accessTokenExpiresAt: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : null,
        connectedEmail: userinfo.data.email ?? null,
      },
      create: {
        companyId: company.id,
        calendarId,
        refreshToken,
        accessToken: tokens.access_token,
        accessTokenExpiresAt: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : null,
        connectedEmail: userinfo.data.email ?? null,
      },
    });
  }

  async getStatus() {
    const company = await this.prisma.company.findFirst();

    if (!company) {
      return { connected: false, configured: this.isConfigured() };
    }

    const credential = await this.prisma.googleCalendarCredential.findUnique({
      where: { companyId: company.id },
    });

    if (!credential) {
      return { connected: false, configured: this.isConfigured() };
    }

    return {
      connected: true,
      configured: this.isConfigured(),
      connectedEmail: credential.connectedEmail,
      calendarId: credential.calendarId,
    };
  }

  async disconnect() {
    const company = await this.prisma.company.findFirst();

    if (!company) return;

    await this.prisma.googleCalendarCredential.deleteMany({
      where: { companyId: company.id },
    });
  }

  private async getClientForCompany(companyId: number) {
    const credential = await this.prisma.googleCalendarCredential.findUnique({
      where: { companyId },
    });

    if (!credential) return null;

    const client = this.createOAuthClient();

    client.setCredentials({
      refresh_token: credential.refreshToken,
      access_token: credential.accessToken ?? undefined,
      expiry_date: credential.accessTokenExpiresAt?.getTime(),
    });

    client.on('tokens', (tokens) => {
      this.prisma.googleCalendarCredential
        .update({
          where: { companyId },
          data: {
            accessToken: tokens.access_token ?? undefined,
            accessTokenExpiresAt: tokens.expiry_date
              ? new Date(tokens.expiry_date)
              : undefined,
          },
        })
        .catch((err) =>
          this.logger.warn(`アクセストークンの更新保存に失敗しました: ${err}`),
        );
    });

    return { client, calendarId: credential.calendarId ?? 'primary' };
  }

  private eventBody(reservation: {
    scheduledStart: Date;
    scheduledEnd: Date;
    staffNote: string | null;
    customer: { customerName: string } | null;
    vehicle: {
      carName: string | null;
      commonModelName: string | null;
      registrationNumber: string | null;
    } | null;
  }) {
    const vehicleName = [
      reservation.vehicle?.carName,
      reservation.vehicle?.commonModelName,
    ]
      .filter(Boolean)
      .join(' ');

    return {
      summary: `${reservation.customer?.customerName ?? '予約'} 様`,
      description: [
        vehicleName || null,
        reservation.vehicle?.registrationNumber
          ? `登録番号: ${reservation.vehicle.registrationNumber}`
          : null,
        reservation.staffNote || null,
      ]
        .filter(Boolean)
        .join('\n'),
      start: {
        dateTime: reservation.scheduledStart.toISOString(),
        timeZone: 'Asia/Tokyo',
      },
      end: {
        dateTime: reservation.scheduledEnd.toISOString(),
        timeZone: 'Asia/Tokyo',
      },
    };
  }

  /** 認証情報がなければ何もせずnullを返す(LineServiceのトークン未設定時と同じno-op方針) */
  async createEvent(
    reservation: Parameters<GoogleCalendarService['eventBody']>[0],
  ): Promise<string | null> {
    const company = await this.prisma.company.findFirst();

    if (!company) return null;

    const ctx = await this.getClientForCompany(company.id);

    if (!ctx) return null;

    try {
      const calendar = google.calendar({ version: 'v3', auth: ctx.client });

      const res = await calendar.events.insert({
        calendarId: ctx.calendarId,
        requestBody: this.eventBody(reservation),
      });

      return res.data.id ?? null;
    } catch (err) {
      this.logger.warn(`Googleカレンダーへのイベント作成に失敗しました: ${err}`);
      return null;
    }
  }

  async updateEvent(
    googleEventId: string,
    reservation: Parameters<GoogleCalendarService['eventBody']>[0],
  ): Promise<void> {
    const company = await this.prisma.company.findFirst();

    if (!company) return;

    const ctx = await this.getClientForCompany(company.id);

    if (!ctx) return;

    try {
      const calendar = google.calendar({ version: 'v3', auth: ctx.client });

      await calendar.events.patch({
        calendarId: ctx.calendarId,
        eventId: googleEventId,
        requestBody: this.eventBody(reservation),
      });
    } catch (err) {
      this.logger.warn(`Googleカレンダーのイベント更新に失敗しました: ${err}`);
    }
  }

  async deleteEvent(googleEventId: string): Promise<void> {
    const company = await this.prisma.company.findFirst();

    if (!company) return;

    const ctx = await this.getClientForCompany(company.id);

    if (!ctx) return;

    try {
      const calendar = google.calendar({ version: 'v3', auth: ctx.client });

      await calendar.events.delete({
        calendarId: ctx.calendarId,
        eventId: googleEventId,
      });
    } catch (err: any) {
      if (err?.code === 404 || err?.code === 410) return;
      this.logger.warn(`Googleカレンダーのイベント削除に失敗しました: ${err}`);
    }
  }
}
