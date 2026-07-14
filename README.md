# cuentas-claras-api

NestJS REST API for Cuentas Claras, a shared-expenses and personal finance app.

## Stack

- NestJS + TypeScript
- PostgreSQL
- Prisma ORM
- `@nestjs/config`
- `class-validator` / `class-transformer`
- Swagger at `/docs`
- Vitest for unit and E2E tests
- A repository-owned pnpm audit validator for dependency vulnerability checks

## Local setup

```bash
pnpm install
cp .env.example .env
docker compose up -d postgres
pnpm run prisma:migrate
pnpm run start:dev
```

The API starts on `http://localhost:3000` by default.

## Useful endpoints

- `GET /health`
- `GET /docs`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/me/summary`
- `GET /api/v1/me/accounts`
- `GET /api/v1/me/personal-transactions`
- `GET /api/v1/groups`
- `GET /api/v1/groups/:groupId/expenses`

## Prisma commands

```bash
pnpm run prisma:generate
pnpm run prisma:migrate
pnpm run prisma:studio
```

## Verification

Run the same checks that CI runs before finishing a feature:

```bash
pnpm run verify
```

The verify flow runs unit tests, E2E tests, and the dependency security audit:

```bash
pnpm test
pnpm run test:e2e
pnpm run security:audit
```

The security audit fails closed on malformed output and on every unapproved moderate-or-higher vulnerability. The only temporary exception is path-scoped and expiry-bound in `scripts/pnpm-audit-validator.mjs`.

## Architecture

The project uses screaming architecture. Top-level folders under `src/` are business domains (`auth`, `me`, `groups`, `expenses`, `settlements`) plus explicit cross-cutting infrastructure (`shared`, `config`, `prisma`). Domain logic is organized behind use cases, ports, adapters, DTOs, and Prisma-backed persistence.
