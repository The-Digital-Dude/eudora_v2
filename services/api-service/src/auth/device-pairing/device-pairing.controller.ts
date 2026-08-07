import { Controller, Post, Body, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { DevicePairingService } from './device-pairing.service';
import { ApproveDevicePairingDto } from './dto/approve-device-pairing.dto';
import { PollDevicePairingDto } from './dto/poll-device-pairing.dto';
import { Public } from '../decorators/public.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { CurrentUserDto } from '../dto/current-user.dto';

@Controller('auth/device')
export class DevicePairingController {
  constructor(private readonly devicePairingService: DevicePairingService) {}

  @Public()
  @Post('start')
  @HttpCode(HttpStatus.OK)
  async start() {
    return this.devicePairingService.start();
  }

  @Post('approve')
  @HttpCode(HttpStatus.OK)
  async approve(
    @Body() dto: ApproveDevicePairingDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.devicePairingService.approve(user.id, dto.code);
  }

  @Public()
  @Post('poll')
  @HttpCode(HttpStatus.OK)
  async poll(@Body() dto: PollDevicePairingDto, @Req() req: any) {
    return this.devicePairingService.poll(
      dto.deviceCode,
      req.headers['user-agent'] || null,
      req.ip || null,
    );
  }
}
