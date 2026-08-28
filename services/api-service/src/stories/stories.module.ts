import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EntitlementsModule } from '../entitlements/entitlements.module';
import { UploadsModule } from '../uploads/uploads.module';
import { StoriesController } from './stories.controller';
import { StoriesService } from './stories.service';

@Module({
  // EntitlementsModule gates the read path — a story is paid course content,
  // reached through the same check as every other module item.
  // UploadsModule provides the selected storage backend, for turning asset
  // storage keys into signed URLs at read time.
  imports: [PrismaModule, EntitlementsModule, UploadsModule],
  controllers: [StoriesController],
  providers: [StoriesService],
  exports: [StoriesService],
})
export class StoriesModule {}
