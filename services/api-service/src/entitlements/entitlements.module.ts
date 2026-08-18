import { Module } from '@nestjs/common';
import { EntitlementsService } from './entitlements.service';
import { EntitlementsController } from './entitlements.controller';
import { ActingStudentService } from './acting-student.service';

/**
 * Exported rather than kept private: catalog, lessons and (from Phase 2)
 * billing all resolve access through this one service, so the gate has a
 * single implementation instead of one per consumer.
 *
 * `ActingStudentService` is exported too so controllers can resolve the
 * acting-child header once and pass it down, rather than each re-deriving it.
 */
@Module({
  controllers: [EntitlementsController],
  providers: [EntitlementsService, ActingStudentService],
  exports: [EntitlementsService, ActingStudentService],
})
export class EntitlementsModule {}
