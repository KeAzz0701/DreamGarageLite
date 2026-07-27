// backend/src/main.ts

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  app.enableShutdownHooks();

  // エラー報告のスクリーンショット(base64)を受け取れるよう、既定の100kbより広げる
  app.useBodyParser('json', { limit: '8mb' });

  app.use(cookieParser());

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: false,
    }),
  );

  app.setGlobalPrefix('api');

  const port = Number(process.env.PORT) || 3001;

  await app.listen(port);

  console.log(`
==========================================
 Dream Garage Lite Backend
==========================================

URL
http://localhost:${port}/api

Health
http://localhost:${port}/api

==========================================
`);
}

bootstrap();