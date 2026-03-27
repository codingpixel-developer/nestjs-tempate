---
name: write-dockerfile
description: Use when creating or updating a Dockerfile for this NestJS project. Covers multi-stage build, asset copying (EJS templates), production-only dependencies, and correct runtime configuration for TypeScript compiled output.
---

# Write Dockerfile — NestJS

## Overview

This project uses a **two-stage Docker build**: a `builder` stage compiles TypeScript, and a `production` stage runs the compiled output with only production dependencies. The compiled entry point is `dist/main.js`.

## Step 0: Ask the User

Before writing any files, ask these two questions one at a time:

1. **App name** — what is the name of this project? (e.g. `my-api`) — used as the Docker container name and in example commands
2. **Port number** — what port does the app listen on? (e.g. `3000`) — used in `EXPOSE` and the `-p` host mapping

Use the answers to replace `<APP_NAME>` and `<PORT>` throughout before writing any files.

## Key Facts About This Project

| Detail             | Value                                                                     |
| ------------------ | ------------------------------------------------------------------------- |
| Node version       | 22 (Alpine)                                                               |
| Build command      | `npm run build` → `nest build`                                            |
| Start command      | `node dist/main`                                                          |
| Default port       | `<PORT>` (set via `PORT` env var)                                         |
| Assets             | EJS mail templates → copied to `dist/mails/templates/` by `nest-cli.json` |
| Env files          | Not baked in — injected at runtime via Docker `--env-file` or Compose     |
| TypeScript aliases | `@/*` → compiled away; no `tsconfig-paths` needed in production           |

## Dockerfile

```dockerfile
# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install all deps (including devDependencies needed for nest build)
COPY package*.json ./
RUN npm ci

# Copy source and compile
COPY . .
RUN npm run build

# ── Stage 2: Production ───────────────────────────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

# Install only production deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled output (includes EJS templates via nest-cli.json assets)
COPY --from=builder /app/dist ./dist

EXPOSE <PORT>

CMD ["node", "dist/main"]
```

## .dockerignore

Always create alongside the Dockerfile:

```
node_modules
dist
.git
.env*
!.env.example
coverage
*.log
.DS_Store
```

## Critical Details

**EJS templates are handled automatically** — `nest-cli.json` copies `src/mails/templates/**/*` into `dist/` during `npm run build`. No manual COPY step is needed.

**Never COPY `.env.*` files** — inject at runtime:

```bash
docker run --env-file .env.production -p <PORT>:<PORT> <APP_NAME>
```

**Database migrations** — run as a separate step, not inside the container start command. Either run via a one-off container before the app starts, or in your CI/CD pipeline after the image is deployed:

```bash
docker exec <container> node -r ts-node/register \
  ./node_modules/typeorm/cli migration:run -d ./dist/config/typeorm.config.js
```

**Port** — the app reads `PORT` from env. Match `EXPOSE` and the host `-p` mapping to the `<PORT>` value provided.

## Common Mistakes

| Mistake                                                  | Fix                                                                   |
| -------------------------------------------------------- | --------------------------------------------------------------------- |
| Copying `node_modules` from builder to production        | Always `npm ci --omit=dev` in the production stage                    |
| Forgetting `.dockerignore`                               | Massively inflates build context; always create it                    |
| Running `npm run start:prod` instead of `node dist/main` | `start:prod` sets `NODE_ENV=production`; set that via env var instead |
| Baking `.env.*` into the image                           | Never. Inject at runtime                                              |
| Using `npm run migration:run` as CMD                     | Migrations must run before the app, as a separate step                |

## File Creation

After all questions are answered and placeholders are filled in, write these two files to the project root:

1. **`Dockerfile`** — the full two-stage Dockerfile above with `<APP_NAME>` and `<PORT>` replaced
2. **`.dockerignore`** — the `.dockerignore` block above (no substitutions needed)

Use the Write tool for both files.
