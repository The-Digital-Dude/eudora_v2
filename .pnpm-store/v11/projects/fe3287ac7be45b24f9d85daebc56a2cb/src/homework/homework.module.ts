import { Module } from '@nestjs/common';
import { HomeworkService } from './homework.service';
import { HomeworkController } from './homework.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { GradebookModule } from '../gradebook/gradebook.module';

@Module({
  imports: [PrismaModule, GradebookModule],
  controllers: [HomeworkController],
  providers: [HomeworkService],
  exports: [HomeworkService],
})
export class HomeworkModule {}
