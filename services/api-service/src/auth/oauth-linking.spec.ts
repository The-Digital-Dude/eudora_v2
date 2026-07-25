import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthProvider } from '@prisma/client';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { NormalizedOAuthProfile } from './oauth/types';
import { GoogleOAuthProvider } from './oauth/providers/google.provider';
import { AppleOAuthProvider } from './oauth/providers/apple.provider';

describe('AuthService OAuth linking', () => {
  let service: AuthService;

  const mockPrisma: any = {
    user: { findUnique: jest.fn(), create: jest.fn() },
    userIdentity: {
      findUnique: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    role: { findUnique: jest.fn() },
    auditLog: { create: jest.fn() },
    authSession: { create: jest.fn() },
  };

  const profile = (
    overrides: Partial<NormalizedOAuthProfile> = {},
  ): NormalizedOAuthProfile => ({
    provider: AuthProvider.GOOGLE,
    providerUserId: 'google-sub-1',
    email: 'Teacher@School.edu',
    emailVerified: true,
    firstName: 'Ada',
    lastName: 'Lovelace',
    ...overrides,
  });

  const activeUser = (overrides: any = {}) => ({
    id: 'user-1',
    email: 'teacher@school.edu',
    password: 'hashed',
    isActive: true,
    deletedAt: null,
    roles: [],
    ...overrides,
  });

  // Exercises the private method directly: it is the single place linking and
  // role rules are enforced, and reaching it through loginWithGoogle would only
  // add Google token-verification mocking without covering more branches.
  const link = (
    p: NormalizedOAuthProfile,
    roleHint?: string | null,
  ): Promise<any> => (service as any).linkOrCreateOAuthUser(p, roleHint);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: { sign: jest.fn(() => 'jwt') } },
        { provide: ConfigService, useValue: { get: jest.fn(() => undefined) } },
        { provide: GoogleOAuthProvider, useValue: { verify: jest.fn() } },
        {
          provide: AppleOAuthProvider,
          useValue: { verifyCallback: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    jest.clearAllMocks();

    jest
      .spyOn(service as any, 'createSessionTokens')
      .mockResolvedValue({ accessToken: 'a', refreshToken: 'r' });
  });

  it('logs in via an existing identity without touching the email lookup', async () => {
    mockPrisma.userIdentity.findUnique.mockResolvedValue({ userId: 'user-1' });
    mockPrisma.user.findUnique.mockResolvedValue(activeUser());

    const result = await link(profile());

    expect(result.user.id).toBe('user-1');
    expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(1);
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user-1' } }),
    );
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  it('refuses to link an existing account when the email is unverified', async () => {
    mockPrisma.userIdentity.findUnique.mockResolvedValue(null);
    mockPrisma.user.findUnique.mockResolvedValue(activeUser());

    await expect(link(profile({ emailVerified: false }))).rejects.toThrow(
      UnauthorizedException,
    );
    expect(mockPrisma.userIdentity.create).not.toHaveBeenCalled();
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          event: 'auth.link.google.rejected',
        }),
      }),
    );
  });

  it('links to an existing account when the email is verified', async () => {
    mockPrisma.userIdentity.findUnique.mockResolvedValue(null);
    mockPrisma.user.findUnique.mockResolvedValue(activeUser());

    const result = await link(profile());

    expect(result.user.id).toBe('user-1');
    expect(mockPrisma.userIdentity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          provider: AuthProvider.GOOGLE,
          providerUserId: 'google-sub-1',
        }),
      }),
    );
  });

  it('never grants a privileged role from the client-supplied hint', async () => {
    mockPrisma.userIdentity.findUnique.mockResolvedValue(null);
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.role.findUnique.mockResolvedValue({ id: 'role-user' });
    mockPrisma.user.create.mockResolvedValue(activeUser({ id: 'user-new' }));

    await link(profile(), 'TEACHER');

    expect(mockPrisma.role.findUnique).toHaveBeenCalledWith({
      where: { name: 'USER' },
    });
  });

  it('honours GUARDIAN, which is on the self-signup allowlist', async () => {
    mockPrisma.userIdentity.findUnique.mockResolvedValue(null);
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.role.findUnique.mockResolvedValue({ id: 'role-guardian' });
    mockPrisma.user.create.mockResolvedValue(activeUser({ id: 'user-new' }));

    await link(profile(), 'guardian');

    expect(mockPrisma.role.findUnique).toHaveBeenCalledWith({
      where: { name: 'GUARDIAN' },
    });
  });

  it('normalizes the email before creating the user', async () => {
    mockPrisma.userIdentity.findUnique.mockResolvedValue(null);
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.role.findUnique.mockResolvedValue({ id: 'role-user' });
    mockPrisma.user.create.mockResolvedValue(activeUser({ id: 'user-new' }));

    await link(profile({ email: '  Mixed@Case.COM ' }));

    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: 'mixed@case.com' }),
      }),
    );
  });

  describe('Apple state binding', () => {
    const NONCE = 'a'.repeat(64);

    const withState = (payload: any) => {
      (service as any).jwtService.verify = jest.fn(() => payload);
    };

    const callback = (cookieNonce?: string) =>
      service.loginWithApple({
        code: 'code-1',
        state: 'state-jwt',
        cookieNonce,
      });

    it('rejects a state whose nonce does not match the browser cookie', async () => {
      withState({ typ: 'apple_state', nonce: NONCE });

      await expect(callback('b'.repeat(64))).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects a missing cookie rather than throwing on length mismatch', async () => {
      withState({ typ: 'apple_state', nonce: NONCE });

      await expect(callback(undefined)).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a signed token that is not an apple_state token', async () => {
      withState({ typ: 'refresh', nonce: NONCE });

      await expect(callback(NONCE)).rejects.toThrow(UnauthorizedException);
    });

    it('passes the role hint from the state, not from the callback body', async () => {
      withState({ typ: 'apple_state', nonce: NONCE, roleHint: 'GUARDIAN' });
      (service as any).appleProvider.verifyCallback = jest
        .fn()
        .mockResolvedValue({
          provider: AuthProvider.APPLE,
          providerUserId: 'apple-sub',
          email: 'a@b.com',
          emailVerified: true,
        });
      mockPrisma.userIdentity.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.role.findUnique.mockResolvedValue({ id: 'role-guardian' });
      mockPrisma.user.create.mockResolvedValue(activeUser({ id: 'user-new' }));

      await callback(NONCE);

      expect(mockPrisma.role.findUnique).toHaveBeenCalledWith({
        where: { name: 'GUARDIAN' },
      });
    });
  });

  it('rejects a deactivated account that holds a linked identity', async () => {
    mockPrisma.userIdentity.findUnique.mockResolvedValue({ userId: 'user-1' });
    mockPrisma.user.findUnique.mockResolvedValue(
      activeUser({ isActive: false }),
    );

    await expect(link(profile())).rejects.toThrow(UnauthorizedException);
  });
});
