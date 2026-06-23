import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TeacherService } from './teacher.service';
import { TeacherController } from './teacher.controller';
import { TeacherPortalController } from './teacher-portal.controller';

@Module({
  imports: [PrismaModule],
  providers: [TeacherService],
  controllers: [TeacherController, TeacherPortalController],
  exports: [TeacherService],
})
export class TeacherModule {}
