# NestJS Auth Template

A production-ready NestJS 11 template with JWT authentication, role-based access control, PostgreSQL, and a set of agent skills for quickly adding integrations.

## Features

- **Authentication & Authorization**
  - JWT access and refresh tokens
  - Separate admin and user authentication flows
  - Role-based access control with guards
  - Password reset via email with time-limited tokens

- **User Management**
  - User signup and profile management
  - Admin user management (deactivate users, change passwords)
  - Password hashing with bcrypt

- **Database**
  - PostgreSQL with TypeORM
  - Transaction support for data integrity
  - Entity relationships (User ↔ Auth)

- **Email Service**
  - SMTP integration for transactional emails
  - EJS templates for email rendering

- **API**
  - Global authentication guard (opt-out via `@Auth()` decorator)
  - Standardized response format via `DataResponseInterceptor`
  - Input validation with `class-validator`
  - Swagger documentation at `/api`
  - Environment validation with Joi

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | NestJS 11 (Express) |
| Language | TypeScript 5.7 (ES2023, `nodenext` modules) |
| Database | PostgreSQL + TypeORM |
| Auth | `@nestjs/jwt`, bcryptjs |
| Email | `@nestjs-modules/mailer` + EJS |
| Validation | `class-validator`, `class-transformer`, Joi |
| Docs | `@nestjs/swagger` |

## Project Setup

```bash
# Install dependencies
npm install

# Copy environment file and fill in values
cp .env.development .env
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `APP_NAME` | Application name (used in Swagger + emails) |
| `PORT` | HTTP port (default: 5614) |
| `FRONTEND_URL` | Frontend base URL |
| `DATABASE_*` | PostgreSQL connection settings |
| `JWT_SECRET` | Secret for user access tokens |
| `JWT_SECRET_ADMIN` | Secret for admin access tokens |
| `JWT_SECRET_VERIFICATION` | Secret for email verification tokens |
| `JWT_SECRET_RESET_PASSWORD` | Secret for password reset tokens |
| `JWT_TOKEN_AUDIENCE` | JWT audience claim |
| `JWT_TOKEN_ISSUER` | JWT issuer claim |
| `JWT_ACCESS_TOKEN_TTL` | Access token TTL in seconds |
| `JWT_REFRESH_TOKEN_TTL` | Refresh token TTL in seconds |
| `MAIL_HOST` | SMTP host |
| `SMTP_USERNAME` | SMTP username |
| `SMTP_PASSWORD` | SMTP password |
| `SMTP_FROM_EMAIL` | Sender email address |
| `SMTP_FROM_NAME` | Sender display name |
| `SEED_ADMIN_EMAIL` | Admin email created by the seeder (default: `admin@template.com`) |
| `SEED_ADMIN_PASSWORD` | Admin password created by the seeder (default: `Admin@1234`) |

## Running the App

```bash
# Development with hot reload
npm run start:dev

# Production build and run
npm run build
npm run start:prod

# Debug mode
npm run start:debug
```

## API Endpoints

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auths/login` | Public | User login |
| POST | `/auths/refresh` | Public | Refresh access token |
| POST | `/auths/forgot-password` | Public | Request password reset email |
| POST | `/auths/reset-password` | Public | Reset password with token |
| POST | `/auths/change-password` | Bearer | Change password |

### Users
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/users/signup` | Public | Register new user |
| GET | `/users/get-current-user` | Bearer | Get current user profile |
| PUT | `/users/update-user/:id` | Bearer | Update current user |

### Admin
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/admin/login` | Public | Admin login |
| POST | `/admin/change-password` | Admin | Change admin password |
| POST | `/admin/deactivate-user` | Admin | Deactivate a user |

Full interactive docs available at `/api` (Swagger UI).

## Architecture

```
src/
├── config/          # registerAs config factories + Joi env validation
├── common/          # Shared decorators, interceptors, error handlers, pagination
├── database/
│   └── seeds/       # Standalone ts-node seeders
├── auths/           # Auth module (login, refresh, password reset, guards)
├── users/           # User module (signup, profile update)
├── admin/           # Admin module (admin login, user management)
├── mails/           # Mail module (SMTP + EJS templates)
├── app.module.ts    # Root module wiring
└── main.ts          # Bootstrap: CORS, ValidationPipe, Swagger
```

### Key providers

| Provider | Purpose |
|----------|---------|
| `SignupUserProvider` | User registration with duplicate-email check |
| `LoginProvider` | Authenticates users and issues access + refresh tokens |
| `GenerateTokensProvider` | Creates signed JWT pairs |
| `ForgotPasswordProvider` | Sends password reset email |
| `ResetPasswordProvider` | Validates reset token and updates password |
| `AccessTokenGuard` | Verifies Bearer tokens on protected routes |
| `AdminGuard` | Restricts routes to admin tokens |
| `AuthenticationGuard` | Global guard that dispatches to the correct sub-guard |

## Coding Conventions

- **Provider-per-action**: each complex operation lives in its own `action-name.provider.ts`; the main `feature.service.ts` delegates to providers.
- **File size**: no provider or service exceeds 350-400 lines; split further if needed.
- **Shared helpers**: reusable utilities go in `src/common/helpers/`.
- **Entities**: single entity lives at module level (`feature/feature.entity.ts`); multiple entities go in `feature/entities/`.
- **Config**: all configs use `registerAs` with a typed interface; validated by Joi in `src/config/env.validation.ts`.
- **Error handling**: use `handleError` from `@/common/error-handlers/error.handler` in catch blocks.
- **Path aliases**: `@/*` resolves to `src/*`.

## Agent Skills

Agent skills live in `.agent/skills/`. Each skill is a directory with a `SKILL.md` that an AI agent reads to add a new integration to the project.

| Skill | Description |
|-------|-------------|
| [add-aws-s3](.agent/skills/add-aws-s3/SKILL.md) | Adds AWS SDK + S3 uploads module |
| [add-stripe](.agent/skills/add-stripe/SKILL.md) | Adds Stripe with webhooks and optional connected accounts |
| [add-sockets](.agent/skills/add-sockets/SKILL.md) | Adds Socket.IO with JWT auth and injectable SocketService |

See [AGENTS.md](AGENTS.md) for full project conventions used by AI agents.

## Database Seeders

Seeders are standalone scripts that connect directly to the database without bootstrapping NestJS. They read credentials from the active env file.

```bash
# Seed the default admin account
npm run seed:admin
```

The admin credentials are set via `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in your env file. The seeder is idempotent -- it skips insertion if the email already exists.

## Scripts

```bash
npm run start:dev     # Development with hot reload
npm run build         # Compile to dist/
npm run start:prod    # Run compiled output
npm run seed:admin    # Seed default admin account
npm run test          # Unit tests
npm run test:e2e      # End-to-end tests
npm run test:cov      # Coverage report
npm run lint          # ESLint with auto-fix
npm run format        # Prettier format
npm run migration:generate --name=<name>  # Generate migration from entity changes
npm run migration:run                     # Run pending migrations
npm run migration:revert                  # Revert last migration
```

## License

UNLICENSED
