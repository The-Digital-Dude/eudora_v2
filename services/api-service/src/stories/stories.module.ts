import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EntitlementsModule } from '../entitlements/entitlements.module';
import { UploadsModule } from '../uploads/uploads.module';
import { AiModule } from '../ai/ai.module';
import { StoriesController } from './stories.controller';
import { StoryDemoController } from './story-demo.controller';
import { StoriesService } from './stories.service';
import { NarrationService } from './narration.service';
import { StoryAgentService } from './story-agent.service';
import { StoryDemoService } from './story-demo.service';
import { StoryDraftService } from './story-draft.service';

@Module({
  // EntitlementsModule gates the read path — a story is paid course content,
  // reached through the same check as every other module item.
  // UploadsModule provides the selected storage backend, for storing generated
  // narration and reading story media back.
  // AiModule provides speech and the language model, without naming a vendor.
  imports: [PrismaModule, EntitlementsModule, UploadsModule, AiModule],
  // Order is load-bearing. Nest registers routes in this order and matches
  // first-wins, and StoriesController owns 'stories/:id' and 'stories/:id/ask'
  // — which would otherwise swallow 'stories/demo' and 'stories/demo/ask' with
  // id='demo', turning the public demo into a 403 from a staff-only route.
  controllers: [StoryDemoController, StoriesController],
  providers: [
    StoriesService,
    NarrationService,
    StoryAgentService,
    StoryDemoService,
    StoryDraftService,
  ],
  exports: [StoriesService],
})
export class StoriesModule {}
