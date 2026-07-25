import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthProvider } from '@prisma/client';
import appleSignin from 'apple-signin-auth';
import { NormalizedOAuthProfile } from '../types';

/** Apple relays mail from this domain when the user picks "Hide My Email". */
const APPLE_PRIVATE_RELAY_DOMAIN = '@privaterelay.appleid.com';

/**
 * Apple caps the client secret at 6 months. Regenerate well inside that so a
 * long-lived process never presents an expired secret; signing is cheap.
 */
const CLIENT_SECRET_TTL_SECONDS = 3600;

interface AppleConfig {
  clientId: string;
  teamId: string;
  keyId: string;
  privateKey: string;
  redirectUri: string;
}

/** Name is supplied by Apple only on the very first authorization. */
interface AppleUserPayload {
  name?: { firstName?: string; lastName?: string };
}

@Injectable()
export class AppleOAuthProvider {
  private cachedSecret?: { value: string; expiresAt: number };

  constructor(private readonly configService: ConfigService) {}

  get isConfigured(): boolean {
    return this.readConfig() !== null;
  }

  private readConfig(): AppleConfig | null {
    const clientId = this.configService.get<string>('APPLE_CLIENT_ID');
    const teamId = this.configService.get<string>('APPLE_TEAM_ID');
    const keyId = this.configService.get<string>('APPLE_KEY_ID');
    const rawKey = this.configService.get<string>('APPLE_PRIVATE_KEY');
    const redirectUri = this.configService.get<string>('APPLE_REDIRECT_URI');

    if (!clientId || !teamId || !keyId || !rawKey || !redirectUri) {
      return null;
    }

    // The .p8 is accepted either base64-encoded (convenient for env vars and
    // secret managers, which mangle multi-line values) or as raw PEM.
    const privateKey = rawKey.includes('BEGIN PRIVATE KEY')
      ? rawKey.replace(/\\n/g, '\n')
      : Buffer.from(rawKey, 'base64').toString('utf8');

    return { clientId, teamId, keyId, privateKey, redirectUri };
  }

  private requireConfig(): AppleConfig {
    const config = this.readConfig();
    if (!config) {
      throw new BadRequestException('Apple sign-in is not configured');
    }
    return config;
  }

  /**
   * Apple has no static client secret: it is an ES256 JWT signed with the .p8
   * key. Cached because every sign-in needs one.
   */
  private getClientSecret(config: AppleConfig): string {
    const now = Date.now();
    if (this.cachedSecret && this.cachedSecret.expiresAt > now) {
      return this.cachedSecret.value;
    }

    const value = appleSignin.getClientSecret({
      clientID: config.clientId,
      teamID: config.teamId,
      privateKey: config.privateKey,
      keyIdentifier: config.keyId,
      expAfter: CLIENT_SECRET_TTL_SECONDS,
    });

    this.cachedSecret = {
      value,
      // Expire the cache early so a secret is never used near its own exp.
      expiresAt: now + (CLIENT_SECRET_TTL_SECONDS - 300) * 1000,
    };
    return value;
  }

  /**
   * URL to send the browser to. Apple replies with a form_post back to
   * redirectUri, so `state` is the CSRF defence and must be verified there.
   */
  buildAuthorizationUrl(state: string): string {
    const config = this.requireConfig();
    return appleSignin.getAuthorizationUrl({
      clientID: config.clientId,
      redirectUri: config.redirectUri,
      state,
      scope: 'name email',
      responseMode: 'form_post',
    });
  }

  /**
   * Exchanges the authorization code for an ID token and normalizes it.
   *
   * `userPayload` is the `user` form field, which Apple sends ONLY on the first
   * authorization for a given user. If it is not persisted now the name is lost
   * permanently, short of the user revoking access in their Apple ID settings.
   */
  async verifyCallback(
    code: string,
    userPayload?: string,
  ): Promise<NormalizedOAuthProfile> {
    const config = this.requireConfig();

    let tokenResponse: { id_token?: string };
    try {
      tokenResponse = await appleSignin.getAuthorizationToken(code, {
        clientID: config.clientId,
        clientSecret: this.getClientSecret(config),
        redirectUri: config.redirectUri,
      });
    } catch {
      throw new UnauthorizedException(
        'Could not exchange the Apple authorization code',
      );
    }

    if (!tokenResponse.id_token) {
      throw new UnauthorizedException('Apple did not return an ID token');
    }

    // Verifies signature against Apple's JWKS plus iss/aud/exp.
    let claims: {
      sub?: string;
      email?: string;
      email_verified?: boolean | string;
      is_private_email?: boolean | string;
    };
    try {
      claims = await appleSignin.verifyIdToken(tokenResponse.id_token, {
        audience: config.clientId,
      });
    } catch {
      throw new UnauthorizedException('Invalid Apple ID token');
    }

    if (!claims.sub || !claims.email) {
      throw new BadRequestException(
        'Apple token does not provide the required profile claims',
      );
    }

    const { firstName, lastName } = this.parseUserPayload(userPayload);
    const email = claims.email;

    return {
      provider: AuthProvider.APPLE,
      providerUserId: claims.sub,
      email,
      // Apple sends these as the strings "true"/"false" in some flows.
      emailVerified: this.asBoolean(claims.email_verified),
      firstName,
      lastName,
      isPrivateRelay:
        this.asBoolean(claims.is_private_email) ||
        email.toLowerCase().endsWith(APPLE_PRIVATE_RELAY_DOMAIN),
    };
  }

  private asBoolean(value: boolean | string | undefined): boolean {
    return value === true || value === 'true';
  }

  private parseUserPayload(userPayload?: string): {
    firstName?: string;
    lastName?: string;
  } {
    if (!userPayload) return {};
    try {
      const parsed = JSON.parse(userPayload) as AppleUserPayload;
      return {
        firstName: parsed.name?.firstName,
        lastName: parsed.name?.lastName,
      };
    } catch {
      // Malformed payload should not block an otherwise valid sign-in.
      return {};
    }
  }
}
