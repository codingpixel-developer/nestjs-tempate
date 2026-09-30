---
name: create-unit-tests
description: Use when backend business rules, security, data integrity, or a bug regression need focused automated coverage.
---

# Create Backend Tests

Read the target code and its existing tests. Choose the smallest layer that proves the behavior:

- Provider unit test for business rules or error handling.
- Controller test for request mapping, authorization, or response behavior.
- E2E test for a flow that depends on multiple modules or framework configuration.

Cover the main path and relevant failure or boundary cases. Do not create a unit, controller, and E2E test for every endpoint by default. Use the mocking and file-placement conventions in `AGENTS.md`.

Run the affected test file or suite once. Rerun after a failure or fix. Run the broader suite only when the change spans modules or a release gate requires it. Report tests run and results. Do not commit unless the user asks.
