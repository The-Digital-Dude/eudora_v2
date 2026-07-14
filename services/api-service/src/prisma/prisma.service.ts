import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  createScopingExtension,
  SCOPED_DELEGATES,
} from './scoping.extension';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const connectionString = process.env.DATABASE_URL ?? '';
    const adapter = new PrismaPg({ connectionString });
    super({ adapter });

    // Route Tier-1 model delegates (and transactions, so their tx clients
    // inherit the policy) through the row-scoping extension while keeping
    // this service assignable to PrismaClient for every existing consumer.
    const extended = this.$extends(createScopingExtension(this));
    return new Proxy(this, {
      get(target, prop, receiver) {
        if (typeof prop === 'string') {
          if (SCOPED_DELEGATES.has(prop)) {
            return (extended as Record<string, any>)[prop];
          }
          if (prop === '$transaction') {
            const fn = (extended as Record<string, any>).$transaction as (
              ...a: unknown[]
            ) => unknown;
            return fn.bind(extended);
          }
        }
        return Reflect.get(target, prop, receiver);
      },
    }) as PrismaService;
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('✅ Database connection established');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Database connection closed');
  }
}
