import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProgressionService } from './progression.service';

@Module({
  imports: [PrismaModule],
  providers: [ProgressionService],
  exports: [ProgressionService],
})
export class ProgressionModule {}
