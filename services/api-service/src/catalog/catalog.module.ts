import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProgressionModule } from '../progression/progression.module';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { ModuleItemsController } from './module-items.controller';
import { ModuleItemsService } from './module-items.service';

@Module({
  imports: [PrismaModule, ProgressionModule],
  controllers: [CatalogController, ModuleItemsController],
  providers: [CatalogService, ModuleItemsService],
  exports: [CatalogService, ModuleItemsService],
})
export class CatalogModule {}
