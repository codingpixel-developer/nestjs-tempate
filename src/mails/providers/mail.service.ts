import { handleError } from '@/common/error-handlers/error.handler';
import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedirectUrls } from '../constants/redirect-urls.constants';

@Injectable()
export class MailsService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async sendResetPasswordEmail(email: string, name: string, token: string) {
    try {
      return await this.mailerService.sendMail({
        to: email,
        subject: `${this.configService.get('app.name')} - Reset Your Password`,
        template: 'reset-password.ejs',
        context: {
          name,
          url:
            this.configService.get('app.frontendUrl') +
            RedirectUrls.RESET_PASSWORD +
            token,
          appName: this.configService.get('app.name'),
        },
      });
    } catch (err) {
      handleError(err);
    }
  }
}
