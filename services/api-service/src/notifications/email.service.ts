import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendMail(to: string, subject: string, body: string): Promise<boolean> {
    this.logger.log(`[Email Service Mock] Sending email to ${to}`);
    this.logger.log(`Subject: ${subject}`);
    this.logger.log(`Body: ${body}`);
    // SMTP/API Transport integration will be added here in the future
    return true;
  }
}
