// backend/src/main.ts

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  app.enableShutdownHooks();

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