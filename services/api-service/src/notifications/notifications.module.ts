import { Module } from '@nestjs/common';
import { DeviceTokensModule } from '../device-tokens/device-tokens.module';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { EmailService } from './email.service';
import { ExpoPushService } from './expo-push.service';

@Module({
  imports: [DeviceTokensModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, EmailService, ExpoPushService],
  exports: [NotificationsService, EmailService],
})
export class NotificationsModule {}
