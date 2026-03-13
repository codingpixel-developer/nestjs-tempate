import { MailerModule } from '@nestjs-modules/mailer';
import { EjsAdapter } from '@nestjs-modules/mailer/dist/adapters/ejs.adapter';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { MailsService } from './providers/mail.service';

@Global()
@Module({
  providers: [MailsService],
  exports: [MailsService],
  imports: [
    MailerModule.forRootAsync({
      useFactory: async (config: ConfigService) => ({
        transport: {
          host: config.get<string>('mail.host'),
          secure: false,
          port: 587,
          requireTLS: true,
          auth: {
            user: config.get('mail.username'),
            pass: config.get('mail.password'),
          },
        },
        defaults: {
          from: `"${config.get('mail.fromName')}" <${config.get('mail.fromEmail')}>`,
        },
        template: {
          dir: join(__dirname, 'templates'),
          adapter: new EjsAdapter({ inlineCssEnabled: true }),
          options: {
            strict: false,
          },
        },
      }),
      inject: [ConfigService],
    }),
  ],
})
export class MailsModule {}
