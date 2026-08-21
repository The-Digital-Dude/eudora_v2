import { Module } from '@nestjs/common';
import { LiveClassesService } from './live-classes.service';
import { LiveClassesController } from './live-classes.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BatchSessionsModule } from '../batch-sessions/batch-sessions.module';

@Module({
  imports: [PrismaModule, BatchSessionsModule],
  controllers: [LiveClassesController],
  providers: [LiveClassesService],
  exports: [LiveClassesService],
})
export class LiveClassesModule {}
