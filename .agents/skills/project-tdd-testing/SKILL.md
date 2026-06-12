---
name: project-tdd-testing
description: "Trigger: TDD, testing, unit test, e2e, regression, Vitest, Testcontainers. Apply this repo's feature-testing rules before changing executable behavior."
license: Apache-2.0
metadata:
  author: "cuentas-claras-api"
  version: "1.0"
---

# Project TDD and Testing

## Activation Contract

Use this skill before implementing a new feature, fixing a bug, changing observable HTTP behavior, or touching Prisma-backed flows.

## Hard Rules

- New features require TDD: **red -> green -> refactor**.
- Bug fixes require a regression test first at the closest failing layer.
- Exceptions are limited to mechanical scaffolding, pure renames, docs-only changes, or config-only changes with no executable logic.
- Unit tests live beside source files as `src/**/*.spec.ts`.
- E2E tests live under `test/**/*.e2e-spec.ts`.
- E2E uses the real Nest app, `supertest`, and PostgreSQL via Testcontainers.
- Run `npm test` after test-impacting changes.
- Run `npm run test:e2e` when HTTP or DB flow changes.

## Decision Gates

| Change type | Preferred test |
|---|---|
| Domain rules, entities, value objects, use cases | Unit |
| Controllers, DTO validation, guards, interceptors, HTTP contracts | Unit and often E2E |
| Prisma mappings or schema-dependent behavior | E2E, plus unit for pure mapping logic |
| Full request -> Nest -> Prisma -> response wiring | E2E |

## Execution Steps

1. Decide whether the change is feature work, bug fix, or an allowed exception.
2. Write the failing unit or E2E test first.
3. Implement the minimum code to pass.
4. Refactor while keeping tests green.
5. Re-run `npm test`, and also `npm run test:e2e` for HTTP/DB changes.

## Output Contract

When reporting work, include:
- which tests were added or updated,
- whether TDD or regression-first was followed,
- whether the change required E2E coverage,
- and which verification commands were run.

## References

- `AGENTS.md`
- `vitest.config.ts`
- `test/`
