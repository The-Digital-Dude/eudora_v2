import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { GamificationService } from './gamification.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('gamification')
@UseGuards(RolesGuard)
@Roles('USER', 'GUARDIAN', 'TEACHER', 'ADMIN', 'SUPER_ADMIN')
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  @Get('me')
  async getMe(@CurrentUser() user: any) {
    return this.gamificationService.getMe(user.id);
  }

  @Get('leaderboard')
  async getLeaderboard(
    @CurrentUser() user: any,
    @Query('scope') scope?: 'class' | 'year',
  ) {
    return this.gamificationService.getLeaderboard(user.id, scope || 'class');
  }

  @Get('me/badges')
  async getBadges(@CurrentUser() user: any) {
    return this.gamificationService.getBadges(user.id);
  }
}
