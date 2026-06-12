import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger, ValidationPipe } from '@nestjs/common';
import { json } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
    // Disable built-in body parser so we can attach rawBody for Stripe webhooks
    rawBody: true,
  });

  // Capture raw body for Stripe webhook signature verification
  app.use(
    '/api/billing/webhooks/stripe',
    json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  // Global route prefix  →  /api/health, /api/...
  app.setGlobalPrefix('api');

  // Enable CORS (configure origins as needed in production)
  app.enableCors();

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Graceful shutdown
  app.enableShutdownHooks();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`🚀 api-service is running on: http://localhost:${port}/api`);
}

bootstrap();

