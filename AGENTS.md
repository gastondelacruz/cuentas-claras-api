# AGENTS.md — cuentas-claras-api

Operational guide for AI agents and humans working in this repo. Read this **before** writing code, tests, or documentation.

## Quick path

1. Identify the domain you will touch (`auth`, `users`, `groups`, `expenses`, `settlements`) or the transversal infrastructure area (`shared`, `config`, `prisma`).
2. **Before touching code**, review [Skills](#skills) and read the matching `SKILL.md`.
3. For architecture-sensitive changes, read `.agents/skills/project-architecture/SKILL.md`.
4. For new features, bug fixes, or test-impacting work, read `.agents/skills/project-tdd-testing/SKILL.md`.
5. Write or modify code following the [Conventions](#conventions).
6. Finish feature work with `pnpm run verify` when practical. If the full verify flow is not practical, run and report the closest subset (`pnpm test`, `pnpm run test:e2e`, `pnpm run security:audit`).

## Development lifecycle

All non-trivial feature work follows this sequence:

```text
DEFINE → PLAN → BUILD → VERIFY → REVIEW → SHIP
```

| Phase | Repository artifact or gate |
| --- | --- |
| DEFINE | `openspec/changes/<change>/proposal.md` with objective and success criteria |
| PLAN | `openspec/changes/<change>/design.md` and `tasks.md` |
| BUILD | One task or vertical slice at a time, using TDD where behavior changes |
| VERIFY | Focused tests, `pnpm run build`, full tests, E2E when applicable, and security audit |
| REVIEW | Pull request review covering correctness, readability, architecture, security, and performance |
| SHIP | Approved merge, release automation, deployment verification, and rollback plan |

### Workflow gates

- Clarify requirements and obtain approval for the proposal before implementation.
- Plan dependency order, acceptance criteria, verification, and checkpoints before coding.
- Keep each increment compilable, tested, and independently revertible.
- Stop on failing tests, ambiguous requirements, or high-risk/irreversible work.
- Do not merge without review or ship without a rollback plan.
- Keep OpenSpec artifacts updated when scope, decisions, or acceptance criteria change.

## Interaction rules

| Rule | Detail |
| ------ | -------- |
| Code approval | Before adding or modifying code, show the plan or diff and **wait for explicit approval**. Do not continue without an OK. |
| Commit approval | **Never** run `git commit` (or `push`, or open a PR) without approval first. Show what will be committed and wait for confirmation. |
| One thing at a time | If there are multiple changes, show them in reviewable parts instead of all at once. |

## Stack

| Layer | Technology |
| ------ | ------------ |
| Runtime | Node.js 26, TypeScript (strict) |
| Framework | NestJS 11 |
| ORM | Prisma 7 (driver adapter `@prisma/adapter-pg`) |
| Database | PostgreSQL 17 (via `docker compose`) |
| Validation | `class-validator` / `class-transformer`, `joi` for env |
| API docs | Swagger at `/docs` |
| Testing | Vitest 4 + `unplugin-swc` + coverage v8, `supertest` for e2e |

## Architecture

Read `.agents/skills/project-architecture/SKILL.md` before changing `src/` structure, domain boundaries, dependency direction, ports, adapters, DTO/domain mapping, persistence mapping, exception flow, or Nest module wiring.

## Conventions

| Topic | Rule |
| ------ | ------ |
| Project artifact language | Write source code, docs, comments, tests, UI copy, and other repo artifacts in **English by default**. Chat language is separate and may follow the user. |
| Indentation | **Tabs** (no spaces). |
| Quotes | **Double quotes** in imports and TS strings. |
| Semicolons | Yes, always. |
| Type imports | `import { type Foo }` when an import is type-only. |
| File names | `kebab-case.<role>.ts` (for example `current-user.decorator.ts`, `http-exception.filter.ts`). |
| DTOs | Classes with `class-validator` decorators. |

## Testing

Read `.agents/skills/project-tdd-testing/SKILL.md` before implementing new behavior, fixing bugs, or changing test coverage.

Keep these repo-specific operational notes in mind:

| Command | Purpose |
| --------- | --------- |
| `pnpm test` | Run unit tests (`src/**/*.spec.ts`) once. |
| `pnpm run test:watch` | Run tests in watch mode during development. |
| `pnpm run test:cov` | Run unit tests with V8 coverage output in `./coverage`. |
| `pnpm run test:e2e` | Run E2E tests (`test/**/*.e2e-spec.ts`) serially against the real app + DB. |
| `pnpm run security:audit` | Run the fail-closed, path-scoped pnpm dependency vulnerability gate. |
| `pnpm run verify` | Run unit tests, E2E tests, and the security audit in the same order used by CI. |

Key notes:

- **Decorators + Vitest**: compilation must go through **SWC** (`unplugin-swc`), not Oxc/esbuild. NestJS depends on `emitDecoratorMetadata`, so `oxc: false` in `vitest.config.ts` is required. Do not remove it.
- Unit tests live **next to the code** they verify (`health.controller.spec.ts` beside `health.controller.ts`).
- E2E tests live under `test/` with the `.e2e-spec.ts` suffix and use `supertest` against the Nest app.
- Use `Test.createTestingModule` for DI-aware unit tests; use real DB integration via Testcontainers in E2E.

## Technical documentation

To understand how to use a library from the stack (NestJS, Prisma, TypeScript, Vitest, Node), use this order:

1. **Repo code first** — the project itself is the source of truth.
2. **Local technical skills (`.agents/skills/`)** — pinned guidance for the actual stack versions in use. See [Project technical skills](#project-technical-skills-agentsskills).
3. **Context7 (MCP)** — fallback for anything the local skill does not cover.
4. **Base knowledge** — only for stable patterns; verify fast-moving details.

Local technical skills are **versioned with the codebase** and pinned to concrete versions. If you upgrade a major dependency, update the relevant skill or fall back to Context7 for newer details.

## Skills

There are **two kinds** of skills. Before each task, identify the context and read the matching `SKILL.md` **before** writing code, tests, docs, or commits. Multiple skills may apply at once.

### Project technical skills (`.agents/skills/`)

These live **inside the repo**, versioned with the codebase and pinned to the stack. They are the **first stop** before Context7.

**Daily use** — most work lands here:

| If you touch... | Skill | Path |
| -------- | ------- | ------ |
| Repo-specific hexagonal + screaming architecture decisions | `project-architecture` | `.agents/skills/project-architecture/SKILL.md` |
| Repo-specific TDD, unit vs E2E, and verification rules | `project-tdd-testing` | `.agents/skills/project-tdd-testing/SKILL.md` |
| NestJS code (modules, DI, guards, controllers, providers) | `nestjs-best-practices` | `.agents/skills/nestjs-best-practices/SKILL.md` |
| Node architecture / async / security decisions | `nodejs-best-practices` | `.agents/skills/nodejs-best-practices/SKILL.md` |
| Prisma Client queries (`findMany`, `create`, `$transaction`, filters) | `prisma-client-api` | `.agents/skills/prisma-client-api/SKILL.md` |
| Prisma CLI commands (`generate`, `migrate`, `db`, `studio`) | `prisma-cli` | `.agents/skills/prisma-cli/SKILL.md` |
| Advanced TypeScript types | `typescript-advanced-types` | `.agents/skills/typescript-advanced-types/SKILL.md` |
| Tests with Vitest (mocking, coverage, fixtures, filtering) | `vitest` | `.agents/skills/vitest/SKILL.md` |

**Secondary reference** — only when the task explicitly needs it:

| If you touch... | Skill | Path |
| -------- | ------- | ------ |
| Node backend API / middleware / error-handling patterns | `nodejs-backend-patterns` | `.agents/skills/nodejs-backend-patterns/SKILL.md` |
| Prisma provider setup / connection issues | `prisma-database-setup` | `.agents/skills/prisma-database-setup/SKILL.md` |
| Prisma Postgres provisioning / Console / create-db | `prisma-postgres` | `.agents/skills/prisma-postgres/SKILL.md` |

> `nodejs-backend-patterns` references Express/Fastify patterns, but the real framework here is **NestJS**. If guidance conflicts, `nestjs-best-practices` wins.

### Workflow skills (`.agents/skills/`)

Workflow skills are versioned in the repository alongside the project-specific technical skills. The installed source and integrity hashes are tracked in `skills-lock.json`:

| Task context | Skill path |
| --- | --- |
| Discover and route agent skills | `.agents/skills/using-agent-skills/SKILL.md` |
| Define requirements before coding | `.agents/skills/spec-driven-development/SKILL.md` |
| Break work into verifiable tasks | `.agents/skills/planning-and-task-breakdown/SKILL.md` |
| Implement incremental slices | `.agents/skills/incremental-implementation/SKILL.md` |
| Apply red-green-refactor TDD | `.agents/skills/test-driven-development/SKILL.md` |
| Review changes before merge | `.agents/skills/code-review-and-quality/SKILL.md` |
| Manage commits and branches | `.agents/skills/git-workflow-and-versioning/SKILL.md` |
| Modify CI/CD automation | `.agents/skills/ci-cd-and-automation/SKILL.md` |
| Debug failed checks systematically | `.agents/skills/debugging-and-error-recovery/SKILL.md` |
| Challenge high-risk decisions | `.agents/skills/doubt-driven-development/SKILL.md` |
| Document decisions and ADRs | `.agents/skills/documentation-and-adrs/SKILL.md` |
| Prepare production releases | `.agents/skills/shipping-and-launch/SKILL.md` |

Protocol:

1. Identify the task context and select only the relevant skill(s).
2. Read the exact `SKILL.md` file(s) **before** reading, writing, reviewing, testing, or creating artifacts.
3. Apply project-specific rules from this file when they conflict with generic workflow guidance.
4. If no workflow skill applies, proceed without loading one.

To add or update a workflow skill, use the standard Skills CLI and commit the resulting files and `skills-lock.json`:

```bash
npx skills add <owner>/<repository> --skill <skill-name> --copy
```

## Checklist before handing off

- [ ] Read the relevant skill(s) from `.agents/skills/`.
- [ ] If architecture-sensitive code changed, `.agents/skills/project-architecture/SKILL.md` was read and followed.
- [ ] For new features, followed TDD: red test first, minimal implementation second, refactor last.
- [ ] Tabs, double quotes, `kebab-case.<role>.ts` names.
- [ ] Added or updated tests and `pnpm test` passes.
- [ ] If HTTP/DB flow changed, `pnpm run test:e2e` passes.
- [ ] Before finishing a feature, `pnpm run verify` passes or any skipped/failing part is reported with the exact command and result.
- [ ] No secrets are committed (`.env` is in `.gitignore`).
