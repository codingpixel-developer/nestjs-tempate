# NestJS Auth Template

A production-ready NestJS template with JWT authentication, role-based access control, and PostgreSQL integration.

## Features

- **Authentication & Authorization**
  - JWT-based authentication with access and refresh tokens
  - Separate admin and user authentication flows
  - Role-based access control (RBAC) with guards
  - Password reset via email

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
  - Password reset flow with secure tokens

- **API Features**
  - Global authentication guard
  - Standardized API response format
  - Input validation with class-validator
  - Environment configuration with validation

## Tech Stack

- **Framework**: NestJS 11
- **Database**: PostgreSQL + TypeORM
- **Authentication**: JWT (@nestjs/jwt)
- **Email**: @nestjs-modules/mailer with EJS
- **Validation**: class-validator + Joi
- **Security**: bcryptjs for password hashing

## Project Setup

```bash
# Install dependencies
$ npm install

# Setup environment
cp .env.development .env
# Edit .env with your configuration
```

## Environment Variables

Create a `.env` file based on `.env.development`:

```env
# App
APP_NAME=Template
PORT=5614
FRONTEND_URL=http://localhost:3000/

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=yourpassword
DATABASE_NAME=template
DATABASE_SYNC=true
DATABASE_AUTOLOAD=true

# JWT Secrets (generate strong random strings)
JWT_SECRET=your-jwt-secret
JWT_SECRET_ADMIN=your-admin-secret
JWT_SECRET_VERIFICATION=your-verification-secret
JWT_SECRET_RESET_PASSWORD=your-reset-secret
JWT_TOKEN_AUDIENCE=template
JWT_TOKEN_ISSUER=template
JWT_ACCESS_TOKEN_TTL=3600
JWT_REFRESH_TOKEN_TTL=86400

# SMTP
MAIL_HOST=smtp.gmail.com
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=Template
```

## Running the App

```bash
# Development with hot reload
$ npm run start:dev

# Production build
$ npm run build
$ npm run start:prod

# Debug mode
$ npm run start:debug
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/signup` | Register new user |
| POST | `/auth/login` | User login |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/forgot-password` | Request password reset |
| POST | `/auth/reset-password` | Reset password with token |
| POST | `/auth/change-password` | Change password (authenticated) |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | Get all users (paginated) |
| GET | `/users/me` | Get current user profile |
| PATCH | `/users/me` | Update current user |
| PATCH | `/users/:id` | Update user by ID (admin) |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/login` | Admin login |
| POST | `/admin/change-password` | Admin change password |
| POST | `/admin/deactivate-user` | Deactivate a user |

## Architecture

```
src/
├── auths/          # Authentication module (JWT, guards, strategies)
├── users/          # User management module
├── admin/          # Admin-specific features
├── mails/          # Email service with templates
├── config/         # Environment configuration
├── common/         # Shared utilities, decorators, interceptors
└── main.ts         # Application entry point
```

### Key Providers

- **SignupUserProvider**: Handles user registration with transaction safety
- **LoginProvider**: Authenticates users and issues tokens
- **AccessTokenGuard**: Protects routes requiring authentication
- **AdminGuard**: Restricts access to admin-only endpoints

## Scripts

```bash
# Unit tests
$ npm run test

# E2E tests
$ npm run test:e2e

# Test coverage
$ npm run test:cov

# Linting
$ npm run lint

# Format code
$ npm run format
```

## Security Features

- Passwords hashed with bcrypt
- JWT tokens with configurable TTL
- Refresh token rotation
- Protected password reset flow with time-limited tokens
- Request validation and sanitization
- Global authentication guard (opt-out via `@Auth()` decorator)

## License

UNLICENSED
