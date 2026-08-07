import { Module } from '@nestjs/common';
import { DevicePairingService } from './device-pairing.service';
import { DevicePairingController } from './device-pairing.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [DevicePairingController],
  providers: [DevicePairingService],
})
export class DevicePairingModule {}
