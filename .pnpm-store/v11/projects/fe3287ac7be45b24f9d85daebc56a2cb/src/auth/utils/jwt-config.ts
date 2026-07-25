import { ConfigService } from '@nestjs/config';

const MIN_SECRET_LENGTH = 32;

/**
 * Resolves the JWT signing secret, failing closed if it is missing or weak.
 *
 * There is deliberately NO default fallback: booting with a hardcoded secret
 * would let anyone forge tokens for any user (including SUPER_ADMIN).
 */
export function getJwtSecret(configService: ConfigService): string {
  const secret = configService.get<string>('JWT_SECRET');

  if (!secret) {
    throw new Error(
      'JWT_SECRET is not set. Refusing to start without a configured signing secret.',
    );
  }

  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters long.`,
    );
  }

  return secret;
}
