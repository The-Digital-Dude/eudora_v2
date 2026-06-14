import { Controller, Post, Body, Get, Req, Res, UseGuards, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { CsrfGuard } from './guards/csrf.guard';
import { setAuthCookies, clearAuthCookies, parseCookieHeader } from './utils/cookies';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: any,
  ) {
    const result = await this.authService.register(dto);
    setAuthCookies(res, result.tokens);
    return result.user;
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
  ) {
    const userAgent = req.headers['user-agent'] || null;
    const ipAddress = req.ip || null;
    const result = await this.authService.login(dto, userAgent, ipAddress);
    setAuthCookies(res, result.tokens);
    return result.user;
  }

  @Get('me')
  async getMe(@CurrentUser() user: any) {
    return user;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
  ) {
    const cookies = parseCookieHeader(req.headers.cookie);
    const refreshToken = cookies['refresh_token'];
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const userAgent = req.headers['user-agent'] || null;
    const ipAddress = req.ip || null;
    const result = await this.authService.refreshSession(refreshToken, userAgent, ipAddress);
    setAuthCookies(res, result.tokens);
    return result.user;
  }

  @Public()
  @UseGuards(CsrfGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
  ) {
    const cookies = parseCookieHeader(req.headers.cookie);
    const refreshToken = cookies['refresh_token'];
    if (refreshToken) {
      const userAgent = req.headers['user-agent'] || null;
      const ipAddress = req.ip || null;
      await this.authService.logout(refreshToken, userAgent, ipAddress);
    }
    clearAuthCookies(res);
  }

  @UseGuards(CsrfGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: any,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.id, dto.currentPassword, dto.newPassword);
  }
}
