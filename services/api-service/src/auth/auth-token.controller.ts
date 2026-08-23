import {
  Controller,
  Post,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/google.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Public } from './decorators/public.decorator';

/**
 * Token-based auth for native clients (mobile, tablet, TV).
 *
 * These endpoints are deliberately separate from AuthController rather than
 * being a mode toggle on it. The cookie flow and the token flow differ in what
 * they return and in how the credential is transported, and folding both into
 * one route behind a header would make the response shape of an existing,
 * browser-facing endpoint depend on a request header — an easy way to break the
 * web client by accident.
 *
 * The tokens themselves are identical to the ones the cookie flow issues, and
 * jwt.strategy.ts already accepts them via the Authorization header, so nothing
 * downstream needs to distinguish a native caller from a browser one.
 */
@Controller('auth/token')
export class AuthTokenController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Native signup. Without this a native client could sign in but never create
   * an account — `/auth/register` sets cookies and hands back a csrfToken,
   * neither of which a bearer-token client can use.
   *
   * The throttle is not decoration and must not be dropped to match the other
   * routes on this controller. They authenticate against rows that already
   * exist; this one creates them, and the cookie route is rate-limited for
   * exactly that reason. An unthrottled native twin would just be a wider door
   * into the same room.
   *
   * No @HttpCode here, deliberately: unlike its neighbours this endpoint
   * creates, so POST's default 201 is the honest status.
   */
  @Public()
  @Throttle({ default: { ttl: 3_600_000, limit: 5 } })
  @Post('register')
  async register(@Body() dto: RegisterDto, @Req() req: any) {
    const result = await this.authService.register(
      dto,
      req.headers['user-agent'] || null,
      req.ip || null,
    );
    return toTokenResponse(result);
  }

  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: any) {
    const result = await this.authService.login(
      dto,
      req.headers['user-agent'] || null,
      req.ip || null,
    );
    return toTokenResponse(result);
  }

  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  async google(@Body() dto: GoogleLoginDto, @Req() req: any) {
    const result = await this.authService.loginWithGoogle(
      dto,
      req.headers['user-agent'] || null,
      req.ip || null,
    );
    return toTokenResponse(result);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: any) {
    const result = await this.authService.refreshSession(
      dto.refreshToken,
      req.headers['user-agent'] || null,
      req.ip || null,
    );
    return toTokenResponse(result);
  }

  @Public()
  @Post('revoke')
  @HttpCode(HttpStatus.OK)
  async revoke(@Body() dto: RefreshTokenDto, @Req() req: any) {
    await this.authService.logout(
      dto.refreshToken,
      req.headers['user-agent'] || null,
      req.ip || null,
    );
    return { revoked: true };
  }
}

/**
 * csrfToken is intentionally dropped: it exists to defend cookie sessions, and
 * a native client has no cookie for it to pair with.
 */
function toTokenResponse(result: {
  user: any;
  tokens: {
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresInSeconds: number;
    refreshTokenExpiresInSeconds: number;
  };
}) {
  return {
    user: result.user,
    accessToken: result.tokens.accessToken,
    refreshToken: result.tokens.refreshToken,
    expiresIn: result.tokens.accessTokenExpiresInSeconds,
    refreshExpiresIn: result.tokens.refreshTokenExpiresInSeconds,
  };
}
