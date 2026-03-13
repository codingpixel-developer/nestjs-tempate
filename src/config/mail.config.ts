import { registerAs } from '@nestjs/config';

export interface MailConfig {
  host: string;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
}

export default registerAs('mail', (): MailConfig => {
  const host = process.env.MAIL_HOST;
  const username = process.env.SMTP_USERNAME;
  const password = process.env.SMTP_PASSWORD;
  const fromEmail = process.env.SMTP_FROM_EMAIL;
  const fromName = process.env.SMTP_FROM_NAME;

  if (!host || !username || !password || !fromEmail || !fromName) {
    throw new Error('Missing required mail configuration');
  }

  return { host, username, password, fromEmail, fromName };
});
