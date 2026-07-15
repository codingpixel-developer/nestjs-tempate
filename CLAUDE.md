# NestJS Auth Template

NestJS 11 authentication template with PostgreSQL, TypeORM, JWT auth, admin management, and transactional email.

## Tech Stack

- **Runtime**: NestJS 11 (Express), TypeScript (ES2023, `nodenext` modules)
- **Database**: PostgreSQL via TypeORM (auto-loaded entities, CLI migrations via `src/config/typeorm.config.ts`)
- **Auth**: JWT access/refresh tokens, bcryptjs, global `AuthenticationGuard`, `@Auth()` decorator for opt-out
- **Validation**: `class-validator` + `class-transformer` (global `ValidationPipe`), Joi for env validation
- **Mail**: `@nestjs-modules/mailer` with EJS templates
- **Docs**: Swagger at `/api`
- **Testing**: Jest 30, ts-jest, `@nestjs/testing`, supertest
- **Path aliases**: `@/*` maps to `src/*`

## Architecture

```
src/
├── config/          # registerAs config factories + Joi env validation
├── common/          # Shared decorators, interceptors, middleware, transformers, error handlers, pagination
├── database/
│   └── seeds/       # Standalone ts-node seeders (run outside NestJS bootstrap)
├── auths/           # Auth module (login, refresh, password reset, guards)
├── users/           # User module (signup, profile update)
├── admin/           # Admin module (admin login, user management)
├── mails/           # Mail module (SMTP + EJS templates)
├── app.module.ts    # Root module: ConfigModule, TypeOrmModule, JWT, guards
└── main.ts          # Bootstrap: CORS, ValidationPipe, Swagger
```

## Conventions

### Module structure

Each feature module follows this layout:

```
feature/
├── feature.module.ts
├── feature.controller.ts
├── feature.controller.spec.ts
├── providers/
│   ├── feature.service/            # Folder when spec exists
│   │   ├── feature.service.ts
│   │   └── feature.service.spec.ts
│   ├── action-name.provider/       # One provider per action (e.g. login.provider/)
│   │   ├── action-name.provider.ts
│   │   └── action-name.provider.spec.ts
│   └── standalone.provider.ts      # Plain file when no spec
├── dtos/
├── entities/
├── enums/
├── guards/          # (if needed)
├── decorators/      # (if needed)
└── interfaces/      # (if needed)
```

### Config pattern

All configs use `registerAs` from `@nestjs/config` and export a typed interface:

```typescript
import { registerAs } from '@nestjs/config';

export interface FooConfig {
  bar: string;
}

export default registerAs(
  'foo',
  (): FooConfig => ({
    bar: process.env.FOO_BAR || 'default',
  }),
);
```

Configs are loaded in `app.module.ts` via `ConfigModule.forRoot({ load: [...] })`. Env vars are validated in `src/config/env.validation.ts` using Joi.

### Error handling

Use `handleError` from `@/common/error-handlers/error.handler` in catch blocks.

### Request logging

Every HTTP request is logged by `LoggerMiddleware` (`src/common/middleware/logger.middleware.ts`), wired globally in `app.module.ts` via `configure()` + `forRoutes('*')`. On response finish it logs `method url status durationMs - ip`: 2xx/3xx at `log`, 4xx and slow requests (>1000ms) at `warn`, 5xx at `error`. Swagger (`/api`) and `/health` paths are skipped; request/response bodies are never logged.

### Response transformers

Outgoing responses pass through a global, extensible transformer pipeline. `ResponseTransformInterceptor` (global `APP_INTERCEPTOR`) runs every transformer registered under the `RESPONSE_TRANSFORMERS` token (`src/common/transformers/`). To add a global transformation, implement `ResponseTransformer` (`transform(payload) => payload`) and add it to that array in `app.module.ts` — no interceptor changes needed.

The first transformer, `AssetUrlTransformer`, expands relative asset paths into full URLs. Mark asset fields with `@AssetUrl()` (`src/common/decorators/asset-url.decorator.ts`) and set `APP_URL` (the server's public base URL) in the env; the transformer prepends it, skipping already-absolute URLs and empty values. Matching is by field **name** (responses are plain objects by the time the interceptor runs), so keep asset field names distinctive.

```typescript
@Entity()
export class User {
  @AssetUrl()
  @Column()
  profileImage: string; // 'uploads/x.jpg' → 'https://api.example.com/uploads/x.jpg'
}
```

### Rate limiting

Global rate limiting via `@nestjs/throttler`. `ThrottlerModule` is configured in `app.module.ts` from `throttle.config.ts` (`THROTTLE_TTL` seconds / `THROTTLE_LIMIT` per IP, default 60/60), and `ThrottlerGuard` is a global `APP_GUARD` registered **before** `AuthenticationGuard` (so unauthenticated abuse is counted). Auth endpoints are hardened with tighter per-route limits via `@Throttle()` (login 5/60s, forgot/reset-password 3/60s). Override a route with `@Throttle({ default: { limit, ttl } })`, exempt one with `@SkipThrottle()`. Exceeding a limit returns **429**.

### Redis & caching

A global `RedisModule` (`src/redis/`) provides a shared `ioredis` client (`REDIS_CLIENT`) built from `redis.config.ts` (`REDIS_URL`, default `redis://localhost:6379`; connects lazily so app boot stays clean without Redis). Inject `CacheService` to cache values — `get`/`set(key, value, ttlSeconds?)`/`del`, or `wrap(key, factory, ttlSeconds?)` for get-or-set. This client is the shared Redis foundation reused by other Redis-backed features.

### Controller patterns

- Swagger decorators: `@ApiTags`, `@ApiOperation`, `@ApiResponse`, `@ApiBody`, `@ApiBearerAuth`
- Auth: `@Auth(AuthType.None)` for public endpoints, `@ApiBearerAuth()` for protected
- Use `@ActiveUser()` decorator for accessing the authenticated user

### Function length

If a function is growing long due to `if/else` or conditional logic, split it into separate focused functions rather than one long branching function:

```typescript
// ❌ One long method with branches
async handle(type: 'create' | 'update') {
  if (type === 'create') {
    // 20 lines
  } else {
    // 20 lines
  }
}

// ✅ Two focused methods
async handleCreate() { ... }
async handleUpdate() { ... }
```

### File size limits

- No provider or service file may exceed 350-400 lines. If logic is complex, split it into separate action provider files (e.g. `create-order.provider.ts`, `cancel-order.provider.ts`).
- Reusable utility functions shared across modules belong in `src/common/helpers/`.

### Entity organization

- If a module has a single entity, it lives at the module level (e.g. `feature/feature.entity.ts`).
- If a module has multiple entities, create an `entities/` folder and place each in its own file (e.g. `feature/entities/order.entity.ts`, `feature/entities/order-item.entity.ts`).

### Seeders

Seeders live in `src/database/seeds/` and are standalone `ts-node` scripts -- they do **not** bootstrap the NestJS application. They connect to the database directly via a raw `DataSource`, load env vars using `dotenv`, and must be run with `tsconfig.seed.json` (which overrides `module` to `commonjs` to avoid `nodenext` issues).

Run the admin seeder:

```bash
npm run seed:admin
```

Seeder credentials are controlled by `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in the active env file.

When creating a new seeder:

- Place it at `src/database/seeds/<name>.seeder.ts`
- Use relative imports (no `@/` aliases)
- Load env conditionally: `const env = process.env.NODE_ENV || ''; dotenv.config({ path: path.resolve(process.cwd(), env ? '.env.${env}' : '.env') })`
- Define `DataSource` inline with explicit entity list and `synchronize: false`
- Check for existing record before inserting (idempotent)
- Call `dataSource.destroy()` in both early-return and success paths
- Export nothing — end with `seed().catch((err) => { console.error('Seeder failed:', err); process.exit(1); })`
- Add a corresponding `seed:<name>` script in `package.json` following the same pattern as `seed:admin`

### Env files

Selected by `NODE_ENV`: `.env.development`, `.env.production`, etc. Fallback: `.env`.

## Testing

### Mandatory rules

- Every new module, controller endpoint, or provider **MUST** have corresponding tests. Test creation is **not optional** — the agent must never skip it.
- After writing any module/API code, the agent **MUST pause** and present all identified edge cases to the user grouped by category before writing any test code.
- Ask the user: "Are there any edge cases I'm missing?" — only proceed after confirmation.
- After writing tests, run `npm test` and `npm run test:e2e` to verify all pass.

### Three test layers

| Layer      | File pattern           | Location                                | What it tests                                       |
| ---------- | ---------------------- | --------------------------------------- | --------------------------------------------------- |
| Unit       | `*.spec.ts`            | Inside provider folder alongside source | Each provider/service in isolation, all deps mocked |
| Controller | `*.controller.spec.ts` | Next to controller file                 | HTTP layer, route handling, delegates to service    |
| E2E        | `*.e2e-spec.ts`        | `test/` directory                       | Full request lifecycle with supertest               |

### Test file placement

When a provider has a test spec file, promote it to a **folder** named after the provider containing both the source and spec files. Providers without tests stay as plain files.

```
feature/
├── feature.controller.ts
├── feature.controller.spec.ts
├── providers/
│   ├── feature.service/
│   │   ├── feature.service.ts
│   │   └── feature.service.spec.ts
│   ├── action.provider/
│   │   ├── action.provider.ts
│   │   └── action.provider.spec.ts
│   └── standalone.provider.ts      # no spec → stays as a file
test/
└── feature.e2e-spec.ts
```

### Edge case categories

When building the edge case matrix for any module, cover ALL of these:

- **Validation:** DTO constraints, regex patterns, required fields, whitelist rejection, type coercion
- **Auth/Authorization:** Missing token, expired token, wrong role, wrong token type, deleted user after token issued
- **Business logic:** Happy path, duplicate data, not found, state conflicts, same-password-as-old checks
- **Database:** Transaction rollback on failure, connection timeout, null/missing relations, concurrent operations
- **Error handling:** Correct exception types (`UnauthorizedException` vs `BadRequestException` vs `NotFoundException`), error messages, `handleError` catch blocks
- **Boundary conditions:** Empty strings, zero/negative IDs, null vs undefined optional fields, max-length strings
- **Response format:** Correct return values, message strings, token structure

### Mocking conventions

- Use `Test.createTestingModule` with provider overrides for DI mocking
- Mock repositories: `{ provide: getRepositoryToken(Entity), useValue: { findOne: jest.fn(), save: jest.fn(), ... } }`
- Mock abstract providers: `{ provide: HashingProvider, useValue: { hashPassword: jest.fn(), comparePassword: jest.fn() } }`
- Mock DataSource/QueryRunner: create a mock `queryRunner` object with `connect`, `startTransaction`, `commitTransaction`, `rollbackTransaction`, `release`, and `manager` methods
- Never mock the class under test
- Reset all mocks in `beforeEach` by rebuilding the test module
- `console.error` is globally silenced in tests via `src/test-setup.ts` (`setupFilesAfterEnv` in Jest config) — this suppresses noise from `handleError`'s default branch during error-path tests
- When moving a provider into a folder for testing, update all imports across the codebase (e.g., `./providers/feature.service` → `./providers/feature.service/feature.service`)

## Skills

Agent skills live in `.claude/skills/`. Each skill is a directory containing a `SKILL.md` with YAML frontmatter (`name`, `description`) and step-by-step instructions.

| Skill                                                                                  | Description                                                                                                                            |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| [add-aws-s3](.claude/skills/add-aws-s3/SKILL.md)                                       | Adds AWS SDK + S3 uploads module to the project                                                                                        |
| [add-stripe](.claude/skills/add-stripe/SKILL.md)                                       | Adds Stripe SDK, config, webhooks, and optional connected accounts                                                                     |
| [add-sockets](.claude/skills/add-sockets/SKILL.md)                                     | Adds Socket.IO WebSockets with JWT auth, gateway, and injectable SocketService                                                         |
| [write-dockerfile](.claude/skills/write-dockerfile/SKILL.md)                           | Generates a multi-stage Dockerfile and .dockerignore for the project — asks for app name and port first                                |
| [github-workflow-docker-deploy](.claude/skills/github-workflow-docker-deploy/SKILL.md) | Creates a GitHub Actions workflow to build and deploy a Docker image via SSH — asks for environment, env file path, app name, and port |
| [create-unit-tests](.claude/skills/create-unit-tests/SKILL.md)                         | Creates comprehensive unit, controller, and E2E tests for a module — identifies edge cases and asks for confirmation before writing    |
