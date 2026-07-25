import { Module } from '@nestjs/common';
import { ParentController } from './parent.controller';
import { ParentService } from './parent.service';
import { PrismaModule } from '../prisma/prisma.module';
import { FamilyModule } from '../family/family.module';

@Module({
  imports: [PrismaModule, FamilyModule],
  controllers: [ParentController],
  providers: [ParentService],
  exports: [ParentService],
})
export class ParentModule {}
