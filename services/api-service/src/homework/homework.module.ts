import { Module } from '@nestjs/common';
import { HomeworkService } from './homework.service';
import { HomeworkController } from './homework.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { GradebookModule } from '../gradebook/gradebook.module';
import { FamilyModule } from '../family/family.module';
import { EntitlementsModule } from '../entitlements/entitlements.module';
import { UploadsModule } from '../uploads/uploads.module';
import { HomeworkAttachmentAccessService } from './homework-attachment-access.service';

@Module({
  // EntitlementsModule brings both the course-access check and the
  // acting-student resolver the submit path depends on.
  imports: [
    PrismaModule,
    GradebookModule,
    FamilyModule,
    EntitlementsModule,
    UploadsModule,
  ],
  controllers: [HomeworkController],
  providers: [HomeworkService, HomeworkAttachmentAccessService],
  exports: [HomeworkService],
})
export class HomeworkModule {}
