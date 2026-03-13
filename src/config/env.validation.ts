import * as Joi from 'joi';

export default Joi.object({
  /* App configuration */
  APP_NAME: Joi.string().required(),
  PORT: Joi.number().port().default(5614),
  FRONTEND_URL: Joi.string().required(),
  /* Database configuration */
  DATABASE_PORT: Joi.number().port().default(5432),
  DATABASE_USERNAME: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().required(),
  DATABASE_NAME: Joi.string().required(),
  DATABASE_HOST: Joi.string().default('localhost'),
  DATABASE_SYNC: Joi.bool().default(false),
  DATABASE_AUTOLOAD: Joi.bool().default(false),
  /* JWT configuration */
  JWT_SECRET: Joi.string().required(),
  JWT_SECRET_ADMIN: Joi.string().required(),
  JWT_SECRET_VERIFICATION: Joi.string().required(),
  JWT_SECRET_RESET_PASSWORD: Joi.string().required(),
  JWT_TOKEN_AUDIENCE: Joi.required(),
  JWT_TOKEN_ISSUER: Joi.string().required(),
  JWT_ACCESS_TOKEN_TTL: Joi.number().required(),
  JWT_REFRESH_TOKEN_TTL: Joi.number().required(),
  /* Mail configuration */
  MAIL_HOST: Joi.string().required(),
  SMTP_USERNAME: Joi.string().required(),
  SMTP_PASSWORD: Joi.string().required(),
  SMTP_FROM_EMAIL: Joi.string().required(),
  SMTP_FROM_NAME: Joi.string().required(),
});
