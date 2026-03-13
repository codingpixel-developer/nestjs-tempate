import { registerAs } from '@nestjs/config';

export interface JwtConfig {
  secret: string;
  secretAdmin: string;
  secretVerification: string;
  audience: string;
  issuer: string;
  accessTokenTtl: number;
  refreshTokenTtl: number;
  secretResetPassword: string;
}

export default registerAs(
  'jwt',
  (): JwtConfig => ({
    secret: process.env.JWT_SECRET || 'super-secret',
    secretVerification:
      process.env.JWT_SECRET_VERIFICATION || 'super-secret-verification',
    secretResetPassword:
      process.env.JWT_SECRET_RESET_PASSWORD || 'super-secret-reset-password',
    audience: process.env.JWT_TOKEN_AUDIENCE || 'template',
    issuer: process.env.JWT_TOKEN_ISSUER || 'template',
    secretAdmin: process.env.JWT_SECRET_ADMIN || 'super-secret-admin',
    accessTokenTtl: parseInt(process.env.JWT_ACCESS_TOKEN_TTL || '3600', 10),
    refreshTokenTtl: parseInt(process.env.JWT_REFRESH_TOKEN_TTL || '86400', 10),
  }),
);
