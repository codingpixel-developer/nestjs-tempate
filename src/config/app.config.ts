import { registerAs } from '@nestjs/config';

export interface AppConfig {
  frontendUrl: string;
  name: string;
}

export default registerAs(
  'app',
  (): AppConfig => ({
    name: process.env.APP_NAME || '',
    frontendUrl: process.env.FRONTEND_URL || '',
  }),
);
