import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  // Enable rawBody option so NestJS automatically captures request stream as Buffer (useful for Stripe webhook verification)
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
    rawBody: true,
  });

  // Global route prefix  →  /api/health, /api/...
  app.setGlobalPrefix('api');

  // Restrict CORS to an explicit allowlist. Wildcard origins are unsafe for a
  // cookie-based auth scheme; set CORS_ORIGINS (comma-separated) in each env.
  const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Generated from existing DTOs/controllers via the `@nestjs/swagger`
  // compiler plugin (nest-cli.json) — property/type inference from
  // class-validator decorators and TS types, not hand-added `@ApiProperty()`
  // calls. `/api/docs-json` is what `openapi-typescript` (client/mobile
  // codegen) points at; `/api/docs` is the browsable UI for humans.
  const swaggerDocument = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Eudora API')
      .setDescription('api-service — student, guardian, and admin surfaces')
      .setVersion('1.0')
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup('api/docs', app, swaggerDocument);

  // Graceful shutdown
  app.enableShutdownHooks();

  const port = process.env.PORT ?? 5000;
  await app.listen(port);
  logger.log(`🚀 api-service is running on: http://localhost:${port}/api`);
}

bootstrap();
