import validationSchema from './env.validation';

const validEnv = {
  APP_NAME: 'Template',
  PORT: '5614',
  FRONTEND_URL: 'http://localhost:5173',
  APP_URL: 'http://localhost:5614',
  THROTTLE_TTL: '60',
  THROTTLE_LIMIT: '60',
  REDIS_URL: 'redis://localhost:6379',
  DATABASE_HOST: 'localhost',
  DATABASE_PORT: '5432',
  DATABASE_USERNAME: 'postgres',
  DATABASE_PASSWORD: 'postgres',
  DATABASE_NAME: 'template',
  DATABASE_SYNC: 'false',
  DATABASE_AUTOLOAD: 'true',
  JWT_SECRET: 'secret',
  JWT_SECRET_ADMIN: 'secret',
  JWT_SECRET_VERIFICATION: 'secret',
  JWT_SECRET_RESET_PASSWORD: 'secret',
  JWT_TOKEN_AUDIENCE: 'http://localhost:5614',
  JWT_TOKEN_ISSUER: 'http://localhost:5614',
  JWT_ACCESS_TOKEN_TTL: '3600',
  JWT_REFRESH_TOKEN_TTL: '86400',
  MAIL_HOST: 'smtp.example.com',
  SMTP_USERNAME: 'user',
  SMTP_PASSWORD: 'pass',
  SMTP_FROM_EMAIL: 'no-reply@example.com',
  SMTP_FROM_NAME: 'Template',
};

describe('env validation', () => {
  it('rejects missing APP_NAME', () => {
    const { error } = validationSchema.validate(
      { ...validEnv, APP_NAME: undefined },
      { allowUnknown: true },
    );
    expect(error?.message).toContain('APP_NAME');
  });

  it('allows unknown vars', () => {
    const { error } = validationSchema.validate(
      { ...validEnv, SOMETHING_ELSE: 'x' },
      { allowUnknown: true },
    );
    expect(error).toBeUndefined();
  });
});
