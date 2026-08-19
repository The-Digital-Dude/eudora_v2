import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  check() {
    return this.healthService.check();
  }

  /**
   * Liveness only — deliberately does NOT touch the database.
   *
   * The free-tier deployment keeps the API container warm with a cron ping
   * every few minutes. Pointing that at `/health` would run its `SELECT 1` on
   * every hit, which keeps a scale-to-zero Postgres (Neon) permanently awake
   * and burns its monthly compute budget for no benefit. This answers "is the
   * process up" without waking anything downstream; use `/health` for the real
   * readiness check.
   */
  @Public()
  @Get('live')
  live() {
    return {
      status: 'ok' as const,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
    };
  }
}
