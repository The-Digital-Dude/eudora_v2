import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/google.dto';
import { AppleAuthorizeDto, AppleCallbackDto } from './dto/apple.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import { CurrentUserDto } from '../auth/dto/current-user.dto';
import { Public } from './decorators/public.decorator';
import { CsrfGuard } from './guards/csrf.guard';
import {
  setAuthCookies,
  clearAuthCookies,
  parseCookieHeader,
  setAppleStateCookie,
  clearAppleStateCookie,
  APPLE_STATE_COOKIE,
} from './utils/cookies';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Five accounts per IP per hour. A household setting up on shared wifi needs
   * one or two; anything past this is a script. Deliberately far tighter than
   * the app-wide default — this endpoint creates rows and, for a teacher
   * applicant, unlocks an upload.
   */
  @Public()
  @Throttle({ default: { ttl: 3_600_000, limit: 5 } })
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: any,
  ) {
    const result = await this.authService.register(dto);
    setAuthCookies(res, result.tokens);
    return { ...result.user, csrfToken: result.tokens.csrfToken };
  }

  /**
   * Complements the per-account lockout in AuthService, which does nothing
   * against an attacker spraying one password across many accounts — that
   * pattern never trips a single account's failure counter.
   */
  @Public()
  @Throttle({ default: { ttl: 300_000, limit: 10 } })
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
    return { ...result.user, csrfToken: result.tokens.csrfToken };
  }

  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  async googleLogin(
    @Body() dto: GoogleLoginDto,
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
  ) {
    const userAgent = req.headers['user-agent'] || null;
    const ipAddress = req.ip || null;
    const result = await this.authService.loginWithGoogle(
      dto,
      userAgent,
      ipAddress,
    );
    setAuthCookies(res, result.tokens);
    return { ...result.user, csrfToken: result.tokens.csrfToken };
  }

  /**
   * Starts the Apple flow. Unlike Google's client-side popup, Apple requires a
   * server-side redirect because it answers with a cross-site form_post.
   */
  @Public()
  @Get('apple/start')
  appleStart(@Query() query: AppleAuthorizeDto, @Res() res: any) {
    const { url, nonce } = this.authService.buildAppleAuthorization(query.role);
    setAppleStateCookie(res, nonce);
    res.redirect(url);
  }

  /**
   * Apple POSTs here as application/x-www-form-urlencoded. On success the
   * session cookies are set and the browser is redirected back into the app —
   * returning JSON would leave the user on a blank API response.
   */
  @Public()
  @Post('apple/callback')
  async appleCallback(
    @Body() dto: AppleCallbackDto,
    @Req() req: any,
    @Res() res: any,
  ) {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    clearAppleStateCookie(res);

    // The user cancelled at Apple's consent screen, or Apple reported an error.
    if (dto.error || !dto.code) {
      return res.redirect(`${appUrl}/login?error=apple_cancelled`);
    }

    const cookies = parseCookieHeader(req.headers.cookie);
    const userAgent = req.headers['user-agent'] || null;
    const ipAddress = req.ip || null;

    try {
      const result = await this.authService.loginWithApple(
        {
          code: dto.code,
          state: dto.state,
          user: dto.user,
          cookieNonce: cookies[APPLE_STATE_COOKIE],
        },
        userAgent,
        ipAddress,
      );
      setAuthCookies(res, result.tokens);
      return res.redirect(`${appUrl}/dashboard`);
    } catch (err) {
      // The redirect target is a fixed app route and the reason is a fixed
      // slug, so no provider-supplied text reaches the browser.
      const reason =
        err instanceof UnauthorizedException
          ? 'apple_rejected'
          : 'apple_failed';
      return res.redirect(`${appUrl}/login?error=${reason}`);
    }
  }

  @Get('me')
  async getMe(@CurrentUser() user: CurrentUserDto) {
    return user;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: any, @Res({ passthrough: true }) res: any) {
    const cookies = parseCookieHeader(req.headers.cookie);
    const refreshToken = cookies['refresh_token'];
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const userAgent = req.headers['user-agent'] || null;
    const ipAddress = req.ip || null;
    const result = await this.authService.refreshSession(
      refreshToken,
      userAgent,
      ipAddress,
    );
    setAuthCookies(res, result.tokens);
    return { ...result.user, csrfToken: result.tokens.csrfToken };
  }

  @Public()
  @UseGuards(CsrfGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: any, @Res({ passthrough: true }) res: any) {
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
    @CurrentUser() user: CurrentUserDto,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
  }
}
