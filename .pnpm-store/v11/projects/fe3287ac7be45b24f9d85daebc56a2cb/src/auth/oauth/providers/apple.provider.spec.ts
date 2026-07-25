import { ConfigService } from '@nestjs/config';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthProvider } from '@prisma/client';
import appleSignin from 'apple-signin-auth';
import { AppleOAuthProvider } from './apple.provider';

jest.mock('apple-signin-auth');

const mockedAppleSignin = appleSignin as jest.Mocked<typeof appleSignin>;

describe('AppleOAuthProvider', () => {
  const env: Record<string, string> = {
    APPLE_CLIENT_ID: 'com.eudora.web',
    APPLE_TEAM_ID: 'TEAM123',
    APPLE_KEY_ID: 'KEY123',
    APPLE_PRIVATE_KEY: Buffer.from(
      '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----',
    ).toString('base64'),
    APPLE_REDIRECT_URI: 'https://api.eudora.test/api/auth/apple/callback',
  };

  const build = (overrides: Record<string, string | undefined> = {}) => {
    const values = { ...env, ...overrides };
    const config = {
      get: jest.fn((key: string) => values[key]),
    } as unknown as ConfigService;
    return new AppleOAuthProvider(config);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAppleSignin.getClientSecret.mockReturnValue('signed-secret');
    mockedAppleSignin.getAuthorizationToken.mockResolvedValue({
      id_token: 'apple-id-token',
    } as any);
  });

  it('reports unconfigured when any credential is missing', () => {
    expect(build().isConfigured).toBe(true);
    expect(build({ APPLE_KEY_ID: undefined }).isConfigured).toBe(false);
  });

  it('decodes a base64 .p8 into PEM before signing the client secret', async () => {
    mockedAppleSignin.verifyIdToken.mockResolvedValue({
      sub: 'apple-sub',
      email: 'a@b.com',
      email_verified: 'true',
    } as any);

    await build().verifyCallback('code-1');

    expect(mockedAppleSignin.getClientSecret).toHaveBeenCalledWith(
      expect.objectContaining({
        privateKey: expect.stringContaining('BEGIN PRIVATE KEY'),
      }),
    );
  });

  it('caches the client secret across calls', async () => {
    mockedAppleSignin.verifyIdToken.mockResolvedValue({
      sub: 'apple-sub',
      email: 'a@b.com',
      email_verified: true,
    } as any);

    const provider = build();
    await provider.verifyCallback('code-1');
    await provider.verifyCallback('code-2');

    expect(mockedAppleSignin.getClientSecret).toHaveBeenCalledTimes(1);
  });

  it('treats the string "true" from email_verified as verified', async () => {
    mockedAppleSignin.verifyIdToken.mockResolvedValue({
      sub: 'apple-sub',
      email: 'a@b.com',
      email_verified: 'true',
    } as any);

    const profile = await build().verifyCallback('code-1');

    expect(profile.provider).toBe(AuthProvider.APPLE);
    expect(profile.emailVerified).toBe(true);
  });

  it('flags private relay addresses', async () => {
    mockedAppleSignin.verifyIdToken.mockResolvedValue({
      sub: 'apple-sub',
      email: 'xyz@privaterelay.appleid.com',
      email_verified: true,
      is_private_email: 'true',
    } as any);

    const profile = await build().verifyCallback('code-1');

    expect(profile.isPrivateRelay).toBe(true);
  });

  it('captures the name from the first-authorization user payload', async () => {
    mockedAppleSignin.verifyIdToken.mockResolvedValue({
      sub: 'apple-sub',
      email: 'a@b.com',
      email_verified: true,
    } as any);

    const profile = await build().verifyCallback(
      'code-1',
      JSON.stringify({ name: { firstName: 'Grace', lastName: 'Hopper' } }),
    );

    expect(profile.firstName).toBe('Grace');
    expect(profile.lastName).toBe('Hopper');
  });

  it('does not fail the sign-in when the user payload is malformed', async () => {
    mockedAppleSignin.verifyIdToken.mockResolvedValue({
      sub: 'apple-sub',
      email: 'a@b.com',
      email_verified: true,
    } as any);

    const profile = await build().verifyCallback('code-1', '{not json');

    expect(profile.firstName).toBeUndefined();
  });

  it('rejects an ID token that fails verification', async () => {
    mockedAppleSignin.verifyIdToken.mockRejectedValue(new Error('bad sig'));

    await expect(build().verifyCallback('code-1')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a token missing the required claims', async () => {
    mockedAppleSignin.verifyIdToken.mockResolvedValue({
      sub: 'apple-sub',
    } as any);

    await expect(build().verifyCallback('code-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('verifies the audience against the configured Services ID', async () => {
    mockedAppleSignin.verifyIdToken.mockResolvedValue({
      sub: 'apple-sub',
      email: 'a@b.com',
      email_verified: true,
    } as any);

    await build().verifyCallback('code-1');

    expect(mockedAppleSignin.verifyIdToken).toHaveBeenCalledWith(
      'apple-id-token',
      { audience: 'com.eudora.web' },
    );
  });
});
