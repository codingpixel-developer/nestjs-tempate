import { registerAs } from '@nestjs/config';

export interface AppConfig {
  frontendUrl: string;
  apiUrl: string;
  name: string;
}

export default registerAs(
  'app',
  (): AppConfig => ({
    name: process.env.APP_NAME || '',
    frontendUrl: process.env.FRONTEND_URL || '',
    apiUrl: process.env.APP_URL || '',
  }),
);
