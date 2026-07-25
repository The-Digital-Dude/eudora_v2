import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface HealthStatus {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  services: {
    database: 'ok' | 'error';
  };
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthStatus> {
    let dbStatus: 'ok' | 'error' = 'error';

    try {
      // Execute a simple query to verify DB connectivity
      await this.prisma.$queryRaw`SELECT 1`;
      dbStatus = 'ok';
    } catch (error) {
      this.logger.warn('Database health check failed', error);
    }

    return {
      status: dbStatus === 'ok' ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      services: {
        database: dbStatus,
      },
    };
  }
}
