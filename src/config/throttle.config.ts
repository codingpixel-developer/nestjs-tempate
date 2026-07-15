import { registerAs } from '@nestjs/config';

export interface ThrottleConfig {
  ttl: number; // milliseconds
  limit: number;
}

export default registerAs(
  'throttle',
  (): ThrottleConfig => ({
    ttl: (Number(process.env.THROTTLE_TTL) || 60) * 1000,
    limit: Number(process.env.THROTTLE_LIMIT) || 60,
  }),
);
