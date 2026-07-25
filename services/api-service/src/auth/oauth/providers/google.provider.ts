import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { AuthProvider } from '@prisma/client';
import { NormalizedOAuthProfile } from '../types';

@Injectable()
export class GoogleOAuthProvider {
  constructor(private readonly configService: ConfigService) {}

  get isConfigured(): boolean {
    return !!this.configService.get<string>('GOOGLE_CLIENT_ID');
  }

  /**
   * Verifies a Google credential and normalizes it. Accepts either an ID token
   * (JWT) or an access token, since @react-oauth/google can yield either
   * depending on which hook the client uses.
   */
  async verify(token: string): Promise<NormalizedOAuthProfile> {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId) {
      throw new BadRequestException('Google sign-in is not configured');
    }
    const client = new OAuth2Client(clientId);

    let email: string | undefined;
    let sub: string | undefined;
    let firstName: string | undefined;
    let lastName: string | undefined;
    let emailVerified = false;

    if (token.startsWith('ey')) {
      // JWT (ID token)
      let ticket;
      try {
        ticket = await client.verifyIdToken({
          idToken: token,
          audience: clientId,
        });
      } catch {
        throw new UnauthorizedException('Invalid Google ID token');
      }

      const payload = ticket.getPayload();
      if (!payload) {
        throw new UnauthorizedException('Invalid Google ID token payload');
      }

      email = payload.email;
      sub = payload.sub;
      firstName = payload.given_name;
      lastName = payload.family_name;
      emailVerified = payload.email_verified === true;
    } else {
      // Access token — verify the token was issued for THIS application before
      // trusting any claims. Without this check, an access token minted for a
      // different Google client (e.g. a malicious third-party app the victim
      // signed into) would be accepted, allowing account takeover.
      let tokenInfo;
      try {
        tokenInfo = await client.getTokenInfo(token);
      } catch {
        throw new UnauthorizedException('Invalid Google access token');
      }

      if (tokenInfo.aud !== clientId) {
        throw new UnauthorizedException(
          'Google access token was not issued for this application',
        );
      }

      email = tokenInfo.email;
      sub = tokenInfo.sub;
      emailVerified = tokenInfo.email_verified === true;

      // Names are not returned by tokeninfo; enrich from userinfo best-effort.
      try {
        const response = await fetch(
          'https://www.googleapis.com/oauth2/v3/userinfo',
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const payload = (await response.json()) as Record<string, string>;
        if (payload && !payload.error && !payload.error_description) {
          firstName = payload.given_name;
          lastName = payload.family_name;
        }
      } catch {
        // Profile enrichment is optional; ignore failures here.
      }
    }

    if (!email || !sub) {
      throw new BadRequestException(
        'Google token does not provide the required profile claims',
      );
    }

    return {
      provider: AuthProvider.GOOGLE,
      providerUserId: sub,
      email,
      emailVerified,
      firstName,
      lastName,
    };
  }
}
