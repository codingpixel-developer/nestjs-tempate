---
name: github-workflow-docker-deploy
description: Use when creating or updating a GitHub Actions workflow that builds a Docker image and deploys it to an Ubuntu server via SSH. Covers GHCR registry, SSH deployment, migrations-before-start, and GitHub Environments for secrets.
---

# GitHub Workflow — Docker Build & Deploy to Ubuntu

## Overview

The workflow has two jobs:

1. **`build`** — build & push Docker image to GitHub Container Registry (GHCR)
2. **`deploy`** — SSH into the Ubuntu server, run migrations, then start the container

## Step 1: Ask the User

Before writing any workflow, ask these four questions one at a time:

1. **Target environment** — staging or production?
2. **Path to the `.env` file on the server** — e.g. `/home/deploy/my-api/.env`
3. **App name** — what is the name of this project? (e.g. `my-api`) — used as the Docker container name
4. **Port number** — what port does the app listen on? (e.g. `3000`) — used in the `-p` host mapping

Use the answers to fill in the placeholders below.

| Answer     | Branch trigger | GitHub Environment name | Env file path     |
| ---------- | -------------- | ----------------------- | ----------------- |
| Staging    | `staging`      | `staging`               | _(user-provided)_ |
| Production | `production`   | `production`            | _(user-provided)_ |

The env file on the server is always named `.env` regardless of environment.

---

## Workflow File

Place at `.github/workflows/deploy-<environment>.yml` (e.g. `deploy-staging.yml`).

Replace `<BRANCH>`, `<ENVIRONMENT>`, and `<ENV_FILE_PATH>` with values from Step 1.

```yaml
name: Build & Deploy (<ENVIRONMENT>)

on:
  push:
    branches: [<BRANCH>]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build:
    name: Build & Push Docker Image
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract Docker metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=sha-
            type=ref,event=branch

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    name: Deploy to Ubuntu (<ENVIRONMENT>)
    needs: build
    runs-on: ubuntu-latest
    environment: <ENVIRONMENT>

    steps:
      - name: Run migrations then start container
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          port: ${{ secrets.SSH_PORT }}
          script: |
            IMAGE="${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.ref_name }}"
            ENV_FILE="<ENV_FILE_PATH>"

            # Pull the new image
            docker pull "$IMAGE"

            # ── 1. Run migrations (must complete before the app starts) ──────
            docker run --rm \
              --env-file "$ENV_FILE" \
              "$IMAGE" \
              node ./node_modules/typeorm/cli migration:run \
                -d ./dist/config/typeorm.config.js

            # ── 2. Replace the running container ─────────────────────────────
            docker stop <APP_NAME> || true
            docker rm   <APP_NAME> || true

            docker run -d \
              --name <APP_NAME> \
              --restart unless-stopped \
              --env-file "$ENV_FILE" \
              -p <PORT>:<PORT> \
              "$IMAGE"

            # Clean up dangling images
            docker image prune -f
```

---

## GitHub Environments & Secrets

Each environment (`staging`, `production`) has its **own secret scope** in GitHub.

Set up under **Settings → Environments → `<environment>` → Secrets**:

| Secret            | Description                                               |
| ----------------- | --------------------------------------------------------- |
| `SSH_HOST`        | IP address or hostname of the server for this environment |
| `SSH_USER`        | Linux username for SSH                                    |
| `SSH_PRIVATE_KEY` | Full contents of the private SSH key                      |
| `SSH_PORT`        | SSH port (usually `22`)                                   |

`GITHUB_TOKEN` is provided automatically — no manual setup.

> With `environment: staging` or `environment: production` on the `deploy` job, GitHub automatically uses that environment's secrets. The same secret name (`SSH_HOST`, etc.) can hold different values per environment.

---

## Server Prerequisites (one-time per environment)

> **Reminder for the user**: The server must already be logged in to GHCR before the first deploy. Run this once on the server:
>
> ```bash
> docker login ghcr.io -u <github-username> -p <personal-access-token>
> ```
>
> Use a PAT with `read:packages` scope. After this, `docker pull` in the workflow will work without re-authenticating.

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Create the directory and place the .env file
mkdir -p /path/to/app          # use the directory part of ENV_FILE_PATH
nano /path/to/app/.env         # paste and fill in values from .env.example
```

---

## Adding a Second Environment Later

1. Create a new workflow file `deploy-production.yml`
2. Change `<BRANCH>` to `production`, `<ENVIRONMENT>` to `production`
3. Update `<ENV_FILE_PATH>` to the production server's `.env` path
4. Add `production` environment secrets in GitHub

---

## Common Mistakes

| Mistake                                          | Fix                                                                           |
| ------------------------------------------------ | ----------------------------------------------------------------------------- |
| Starting the app before migrations finish        | Migrations run in a `docker run --rm` step before `docker run -d`             |
| Using `latest` tag only                          | SHA + branch tags are pushed; rollbacks need a specific tag                   |
| Hardcoding the env file path                     | Always ask the user for the path — it varies per server setup                 |
| Naming the env file `.env.staging` on the server | Always name it `.env`; the environment is implied by which server it lives on |
| Storing `.env` in the repo                       | Keep it on the server only; never commit it                                   |
| Forgetting `environment:` on the deploy job      | Without it, GitHub uses repo-level secrets, not environment-scoped ones       |

## File Creation

After all questions are answered and placeholders are filled in, write the workflow file:

- **`.github/workflows/deploy-<environment>.yml`** — the full workflow above with all placeholders replaced

Use the Write tool. Create the `.github/workflows/` directory if it does not exist.
