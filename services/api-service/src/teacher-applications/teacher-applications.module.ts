import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadsModule } from '../uploads/uploads.module';
import { TeacherApplicationsController } from './teacher-applications.controller';
import { TeacherApplicationsService } from './teacher-applications.service';

/**
 * Kept apart from TeacherModule on purpose. That module is about people who
 * already teach here; this one is about people asking to, who hold no teaching
 * access at all. Collapsing them would put the review endpoints behind the
 * same TEACHER-shaped assumptions.
 */
@Module({
  imports: [PrismaModule, UploadsModule],
  controllers: [TeacherApplicationsController],
  providers: [TeacherApplicationsService],
})
export class TeacherApplicationsModule {}
