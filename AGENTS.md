# AGENTS.md — cuentas-claras-api

Operational guide for AI agents and humans working in this repo. Read this **before** writing code, tests, or documentation.

## Quick path

1. Identify the domain you will touch (`auth`, `users`, `groups`, `expenses`, `settlements`) or the transversal infrastructure area (`shared`, `config`, `prisma`).
2. **Before touching code**, review [Skills](#skills) and read the matching `SKILL.md`.
3. For architecture-sensitive changes, read `.agents/skills/project-architecture/SKILL.md`.
4. For new features, bug fixes, or test-impacting work, read `.agents/skills/project-tdd-testing/SKILL.md`.
5. Write or modify code following the [Conventions](#conventions).
6. Finish feature work with `pnpm run verify` when practical. If the full verify flow is not practical, run and report the closest subset (`pnpm test`, `pnpm run test:e2e`, `pnpm run security:audit`).

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

### Workflow skills (`.atl/skill-registry.md`)

These live **outside the repo** (installed in `~/.config/opencode/skills` and equivalent paths). **Do not copy them into the project.** The canonical index is `.atl/skill-registry.md`:

| Task context | Skill to read |
| ---------------------- | -------------- |
| Create/open/prepare a Pull Request | `branch-pr` |
| Large PR (>400 lines) or slice-based work | `chained-pr` |
| Plan commits as reviewable work units | `work-unit-commits` |
| Write docs, READMEs, guides, onboarding | `cognitive-doc-design` |
| PR/issue/review comments | `comment-writer` |
| Create issues / bug reports | `issue-creation` |
| Adversarial / dual review | `judgment-day` |
| Create a new skill | `skill-creator` |
| Audit/improve skills | `skill-improver` |

Protocol:

1. Read the `Trigger / description` column in `.atl/skill-registry.md`.
2. Open the exact `SKILL.md` at the listed path **before** starting work.
3. If no workflow skill applies, proceed without loading one.

If you add, remove, or change workflow skills, regenerate the index:

```bash
gentle-ai skill-registry refresh --force
```

## Checklist before handing off

- [ ] Read the relevant skill(s): technical (`.agents/skills/`) and/or workflow (`.atl/skill-registry.md`).
- [ ] If architecture-sensitive code changed, `.agents/skills/project-architecture/SKILL.md` was read and followed.
- [ ] For new features, followed TDD: red test first, minimal implementation second, refactor last.
- [ ] Tabs, double quotes, `kebab-case.<role>.ts` names.
- [ ] Added or updated tests and `pnpm test` passes.
- [ ] If HTTP/DB flow changed, `pnpm run test:e2e` passes.
- [ ] Before finishing a feature, `pnpm run verify` passes or any skipped/failing part is reported with the exact command and result.
- [ ] No secrets are committed (`.env` is in `.gitignore`).
