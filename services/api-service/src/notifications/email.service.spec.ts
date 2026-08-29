import { Logger } from '@nestjs/common';
import { EmailService } from './email.service';

describe('EmailService', () => {
  const originalKey = process.env.RESEND_API_KEY;

  afterEach(() => {
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
    jest.restoreAllMocks();
  });

  describe('when unconfigured', () => {
    beforeEach(() => {
      delete process.env.RESEND_API_KEY;
    });

    it('reports failure rather than pretending it sent', async () => {
      // The previous mock returned true unconditionally, which is what let the
      // product believe mail was working when nothing was ever delivered.
      const service = new EmailService();
      await expect(
        service.sendMail('a@b.com', 'Subject', 'Body'),
      ).resolves.toBe(false);
      expect(service.isConfigured).toBe(false);
    });

    /**
     * Regression guard. An earlier revision logged the message body here so an
     * operator could see what would have gone out — which put a live
     * password-reset link, i.e. a working account-takeover credential, into the
     * server log of every environment without mail configured.
     */
    it('never writes the message body to the log', async () => {
      const logged: string[] = [];
      jest
        .spyOn(Logger.prototype, 'log')
        .mockImplementation((m: any) => void logged.push(String(m)));
      jest
        .spyOn(Logger.prototype, 'debug')
        .mockImplementation((m: any) => void logged.push(String(m)));
      jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

      const service = new EmailService();
      const resetLink =
        'http://localhost:3001/reset-password?token=SECRET_TOKEN_VALUE';
      await service.sendMail(
        'parent@example.com',
        'Reset your Eudora password',
        `Open this link:\n${resetLink}\n`,
      );

      const all = logged.join('\n');
      expect(all).not.toContain('SECRET_TOKEN_VALUE');
      expect(all).not.toContain('token=');
      // The useful part is still reported.
      expect(all).toContain('parent@example.com');
    });
  });

  describe('when configured', () => {
    beforeEach(() => {
      process.env.RESEND_API_KEY = 're_test_key';
    });

    it('posts to Resend and reports success', async () => {
      const fetchMock = jest
        .spyOn(global, 'fetch')
        .mockResolvedValue({ ok: true, text: async () => '' } as any);

      const service = new EmailService();
      await expect(
        service.sendMail('a@b.com', 'Subject', 'Body'),
      ).resolves.toBe(true);

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://api.resend.com/emails');
      expect((init.headers as Record<string, string>).Authorization).toBe(
        'Bearer re_test_key',
      );
      expect(JSON.parse(init.body as string).to).toEqual(['a@b.com']);
    });

    it('reports failure when the provider rejects the message', async () => {
      jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 422,
        text: async () => 'domain not verified',
      } as any);

      const service = new EmailService();
      await expect(
        service.sendMail('a@b.com', 'Subject', 'Body'),
      ).resolves.toBe(false);
    });

    it('reports failure when the request throws', async () => {
      jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network down'));

      const service = new EmailService();
      await expect(
        service.sendMail('a@b.com', 'Subject', 'Body'),
      ).resolves.toBe(false);
    });
  });
});
