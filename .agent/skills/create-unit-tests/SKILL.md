---
name: create-unit-tests
description: Creates comprehensive unit, controller, and E2E tests for a module — identifies edge cases and asks for confirmation before writing
---

# Create Unit Tests

Use this skill after creating or modifying any module, controller, or provider. Can also be invoked manually to add tests to existing modules.

## Prerequisites

- Target module must exist with at least a controller and one provider
- Jest configured in `package.json` with `moduleNameMapper` for `@/*`
- `@nestjs/testing` and `supertest` installed

## Workflow

### Step 1: Analyze the module

Read ALL files in the target module:
- Controller (endpoints, decorators, auth types, parameters)
- Service (delegation methods, constructor dependencies)
- All providers (business logic, error handling, database operations)
- DTOs (validation decorators, regex patterns, optional fields)
- Entities (columns, relations, constraints)
- Guards/decorators if custom ones exist

### Step 2: Build the edge case matrix

For each provider and controller endpoint, identify edge cases in ALL categories:

**Validation:**
- Missing required fields
- Invalid format (email, password regex, etc.)
- Empty strings, whitespace-only
- Extra/unknown fields (stripped by whitelist)
- Type coercion edge cases

**Auth/Authorization:**
- Endpoint called without token (if protected)
- Endpoint called with expired/invalid token
- Endpoint called with wrong role token (user vs admin)
- User/admin deleted after token was issued

**Business logic:**
- Happy path (valid input, expected output)
- Duplicate data (e.g., signup with existing email)
- Resource not found (invalid ID, deleted user)
- State conflicts (same password as old, expired reset token)
- Null/undefined return from database queries

**Database:**
- Transaction rollback on error
- Connection failure (RequestTimeoutException)
- Query failure in try/catch blocks

**Error handling:**
- Correct exception class thrown (UnauthorizedException vs BadRequestException vs NotFoundException)
- Correct error message string
- handleError properly re-throws HttpExceptions

**Boundary conditions:**
- ID of 0, null, undefined, or negative
- Optional fields omitted vs explicitly null
- Very long strings

**Response format:**
- Correct return value (string message, object shape, token structure)

### Step 3: Present edge cases to user

Format the edge case matrix as a grouped list and ask:

> "Here are all the edge cases I've identified for the **[module name]** module. Are there any edge cases I'm missing?"

**Wait for user confirmation before proceeding.**

### Step 4: Write unit tests

For each provider that will have tests, promote it to a **folder** containing both the source and spec file. Providers without tests stay as plain files.

**Before (flat):**
```
providers/
├── feature.service.ts
└── action.provider.ts
```

**After (with tests):**
```
providers/
├── feature.service/
│   ├── feature.service.ts
│   └── feature.service.spec.ts
├── action.provider/
│   ├── action.provider.ts
│   └── action.provider.spec.ts
└── standalone.provider.ts      # no spec → stays as a file
```

After moving the source file into the folder, update all imports across the codebase that reference the old path (e.g., `./providers/feature.service` → `./providers/feature.service/feature.service`).

**Test file structure:**
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('ProviderName', () => {
  let provider: ProviderName;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProviderName,
        // mocked dependencies
      ],
    }).compile();

    provider = module.get<ProviderName>(ProviderName);
  });

  describe('methodName', () => {
    it('should [happy path description]', async () => { ... });
    it('should throw [ExceptionType] when [edge case]', async () => { ... });
  });
});
```

**Mocking patterns:**

Repository mock:
```typescript
{ provide: getRepositoryToken(Entity), useValue: { findOne: jest.fn(), save: jest.fn(), create: jest.fn(), delete: jest.fn() } }
```

DataSource/QueryRunner mock:
```typescript
const mockQueryRunner = {
  connect: jest.fn(), startTransaction: jest.fn(),
  commitTransaction: jest.fn(), rollbackTransaction: jest.fn(),
  release: jest.fn(),
  manager: { findOne: jest.fn(), save: jest.fn(), create: jest.fn(), delete: jest.fn() },
};
{ provide: DataSource, useValue: { createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner) } }
```

Abstract provider mock:
```typescript
{ provide: HashingProvider, useValue: { hashPassword: jest.fn(), comparePassword: jest.fn() } }
```

### Step 5: Write controller tests

Create `*.controller.spec.ts` next to the controller. Test that each endpoint calls the correct service method with correct arguments and returns the response.

### Step 6: Write E2E tests

Create `test/<module>.e2e-spec.ts`. Use `Test.createTestingModule` with the controller directly, mock the service, override guards, and apply `ValidationPipe`.

### Step 7: Run and verify

```bash
npm test                 # Unit + controller tests
npm run test:e2e         # E2E tests
```

All tests must pass. Fix any failures before committing.

### Step 8: Commit

```bash
git add <test files>
git commit -m "test: add unit, controller, and E2E tests for [module name]"
```
