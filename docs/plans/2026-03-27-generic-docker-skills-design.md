# Design: Make Docker Skills Generic

**Date:** 2026-03-27
**Scope:** `.agent/skills/write-dockerfile` and `.agent/skills/github-workflow-docker-deploy`

## Problem

Both skills are hardcoded to the `juniorfit-api` project (container name) and port `5621`. They cannot be reused for other projects without manual editing.

## Goal

Make both skills interactive — they ask for app name and port before generating any files, then write the files to disk automatically.

## Approach

**Option A — "Ask first, then fill placeholders"**: Add a "Step 0 / extend Step 1" section to each skill that collects required inputs. Replace all hardcoded values with `<APP_NAME>` / `<PORT>` placeholders. Add a file-creation instruction at the end of each skill.

## Changes

### `write-dockerfile/SKILL.md`

- Add **Step 0: Ask the User** at the top, collecting:
  1. App name (e.g. `my-api`) — used in container name examples
  2. Port number (e.g. `3000`) — used in EXPOSE and -p mapping
- Remove project-specific title suffix `(juniorfit-api)`
- Replace all `juniorfit-api` → `<APP_NAME>` and `5621` → `<PORT>` throughout
- Add file creation instruction at the end: write `Dockerfile` and `.dockerignore` to project root

### `github-workflow-docker-deploy/SKILL.md`

- Extend existing **Step 1: Ask the User** with two new questions:
  3. App name (e.g. `my-api`) — used as Docker container name
  4. Port number (e.g. `3000`) — used in `-p` port mapping
- Replace all `juniorfit-api` → `<APP_NAME>` and `5621` → `<PORT>` throughout
- Add file creation instruction at the end: write `.github/workflows/deploy-<environment>.yml`
