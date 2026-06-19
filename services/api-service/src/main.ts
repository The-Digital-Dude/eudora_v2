import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger, ValidationPipe } from '@nestjs/common';
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

  const port = process.env.PORT ?? 5000;
  await app.listen(port);
  logger.log(`🚀 api-service is running on: http://localhost:${port}/api`);
}

bootstrap();
