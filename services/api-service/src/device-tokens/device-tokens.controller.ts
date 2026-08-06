import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUserDto } from '../auth/dto/current-user.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { DeviceTokensService } from './device-tokens.service';
import { RegisterDeviceTokenDto } from './dto/register-device-token.dto';

// Self-service only — every authenticated role registers its own device,
// no admin/teacher path to manage another user's tokens.
@Controller('device-tokens')
@UseGuards(RolesGuard)
export class DeviceTokensController {
  constructor(private readonly deviceTokensService: DeviceTokensService) {}

  @Post()
  async register(
    @Body() dto: RegisterDeviceTokenDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.deviceTokensService.register(user.id, dto);
  }

  @Delete(':token')
  @HttpCode(HttpStatus.OK)
  async unregister(
    @Param('token') token: string,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.deviceTokensService.unregister(user.id, token);
  }
}
