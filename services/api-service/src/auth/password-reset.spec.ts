import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleOAuthProvider } from './oauth/providers/google.provider';
import { AppleOAuthProvider } from './oauth/providers/apple.provider';
import { EmailService } from '../notifications/email.service';

/**
 * Password reset is the one unauthenticated write that can take over an
 * account, so these pin the security properties rather than the happy path:
 * no user enumeration, single use, expiry, session revocation, and that the
 * raw token never reaches the database.
 */
describe('AuthService — password reset', () => {
  let service: AuthService;

  const mockPrisma: any = {
    user: { findUnique: jest.fn(), update: jest.fn() },
    passwordResetToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    authSession: { updateMany: jest.fn() },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn((fn: any) => fn(mockPrisma)),
  };

  const mockEmail: any = { sendMail: jest.fn().mockResolvedValue(true) };

  const activeUser = {
    id: 'user-1',
    email: 'parent@example.com',
    password: 'hashed',
    isActive: true,
    deletedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: { sign: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn(() => undefined) } },
        { provide: GoogleOAuthProvider, useValue: { verify: jest.fn() } },
        {
          provide: AppleOAuthProvider,
          useValue: { verifyCallback: jest.fn() },
        },
        { provide: EmailService, useValue: mockEmail },
      ],
    }).compile();

    service = module.get(AuthService);
    jest.clearAllMocks();
    mockPrisma.passwordResetToken.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.$transaction.mockImplementation((fn: any) => fn(mockPrisma));
  });

  describe('requestPasswordReset', () => {
    it('sends a link to a real account and stores only the hash', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(activeUser);

      await service.requestPasswordReset('parent@example.com', '1.2.3.4');

      expect(mockEmail.sendMail).toHaveBeenCalledTimes(1);
      const [to, subject, body] = mockEmail.sendMail.mock.calls[0];
      expect(to).toBe('parent@example.com');
      expect(subject).toMatch(/reset/i);

      // The link carries the raw token...
      const rawToken = /token=([A-Za-z0-9_-]+)/.exec(body)?.[1];
      expect(rawToken).toBeTruthy();

      // ...and what was persisted is its SHA-256, never the token itself.
      const { data } = mockPrisma.passwordResetToken.create.mock.calls[0][0];
      expect(data.tokenHash).toBe(
        crypto.createHash('sha256').update(rawToken!).digest('hex'),
      );
      expect(data.tokenHash).not.toBe(rawToken);
      expect(JSON.stringify(data)).not.toContain(rawToken);
    });

    it('retires any outstanding link when a new one is issued', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(activeUser);

      await service.requestPasswordReset('parent@example.com');

      expect(mockPrisma.passwordResetToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', consumedAt: null },
          data: expect.objectContaining({ consumedAt: expect.any(Date) }),
        }),
      );
    });

    // The enumeration guarantee: an unknown address must be indistinguishable
    // from a known one to the caller.
    it('is silent about an address with no account', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.requestPasswordReset('nobody@example.com'),
      ).resolves.toBeUndefined();

      expect(mockEmail.sendMail).not.toHaveBeenCalled();
      expect(mockPrisma.passwordResetToken.create).not.toHaveBeenCalled();
    });

    it('issues nothing for a deactivated account', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...activeUser,
        isActive: false,
      });

      await service.requestPasswordReset('parent@example.com');

      expect(mockPrisma.passwordResetToken.create).not.toHaveBeenCalled();
    });

    it('explains rather than resets for a Google-only account', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...activeUser,
        password: null,
      });

      await service.requestPasswordReset('parent@example.com');

      expect(mockPrisma.passwordResetToken.create).not.toHaveBeenCalled();
      expect(mockEmail.sendMail).toHaveBeenCalledTimes(1);
      expect(mockEmail.sendMail.mock.calls[0][2]).toMatch(/Google/);
    });
  });

  describe('resetPassword', () => {
    const validRecord = (overrides: Record<string, unknown> = {}) => ({
      id: 'token-1',
      userId: 'user-1',
      consumedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user: activeUser,
      ...overrides,
    });

    it('sets the new password and revokes every live session', async () => {
      mockPrisma.passwordResetToken.findUnique.mockResolvedValue(validRecord());

      await service.resetPassword('raw-token', 'NewPassw0rdHere');

      const update = mockPrisma.user.update.mock.calls[0][0];
      expect(update.where).toEqual({ id: 'user-1' });
      // Stored hashed, never in the clear.
      expect(update.data.password).not.toBe('NewPassw0rdHere');
      await expect(
        bcrypt.compare('NewPassw0rdHere', update.data.password),
      ).resolves.toBe(true);
      // A reset is also the way out of a lockout.
      expect(update.data.failedLoginCount).toBe(0);
      expect(update.data.lockedUntil).toBeNull();

      expect(mockPrisma.authSession.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', revokedAt: null },
          data: expect.objectContaining({ revokedReason: 'password_reset' }),
        }),
      );
    });

    it('looks the token up by hash, never by the raw value', async () => {
      mockPrisma.passwordResetToken.findUnique.mockResolvedValue(validRecord());

      await service.resetPassword('raw-token', 'NewPassw0rdHere');

      expect(mockPrisma.passwordResetToken.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tokenHash: crypto
              .createHash('sha256')
              .update('raw-token')
              .digest('hex'),
          },
        }),
      );
    });

    it('refuses a token that has already been used', async () => {
      mockPrisma.passwordResetToken.findUnique.mockResolvedValue(
        validRecord({ consumedAt: new Date() }),
      );

      await expect(
        service.resetPassword('raw-token', 'NewPassw0rdHere'),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('refuses an expired token', async () => {
      mockPrisma.passwordResetToken.findUnique.mockResolvedValue(
        validRecord({ expiresAt: new Date(Date.now() - 1) }),
      );

      await expect(
        service.resetPassword('raw-token', 'NewPassw0rdHere'),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('refuses an unknown token', async () => {
      mockPrisma.passwordResetToken.findUnique.mockResolvedValue(null);

      await expect(
        service.resetPassword('nope', 'NewPassw0rdHere'),
      ).rejects.toThrow(BadRequestException);
    });

    // Two requests racing the same link: the conditional consume means only
    // the one that claims the row may set a password.
    it('lets only one of two concurrent redemptions win', async () => {
      mockPrisma.passwordResetToken.findUnique.mockResolvedValue(validRecord());
      mockPrisma.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.resetPassword('raw-token', 'NewPassw0rdHere'),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('gives the same message for unknown, expired and used tokens', async () => {
      const messages: string[] = [];
      for (const record of [
        null,
        validRecord({ consumedAt: new Date() }),
        validRecord({ expiresAt: new Date(Date.now() - 1) }),
      ]) {
        mockPrisma.passwordResetToken.findUnique.mockResolvedValue(record);
        await service
          .resetPassword('raw-token', 'NewPassw0rdHere')
          .catch((e: Error) => messages.push(e.message));
      }
      expect(new Set(messages).size).toBe(1);
    });
  });
});
