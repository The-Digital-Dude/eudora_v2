import { Module } from '@nestjs/common';
import { MakeupService } from './makeup.service';
import { MakeupController } from './makeup.controller';

@Module({
  controllers: [MakeupController],
  providers: [MakeupService],
  exports: [MakeupService],
})
export class MakeupModule {}
