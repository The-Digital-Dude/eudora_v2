import { Module } from '@nestjs/common';
import { DiagnosticsService } from './diagnostics.service';
import { PlacementService } from './placement.service';
import { DiagnosticsController } from './diagnostics.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DiagnosticsController],
  providers: [DiagnosticsService, PlacementService],
  exports: [DiagnosticsService, PlacementService],
})
export class DiagnosticsModule {}
