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
- `audit-ci` for dependency vulnerability checks

## Local setup

```bash
npm install
cp .env.example .env
docker compose up -d postgres
npm run prisma:migrate
npm run start:dev
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
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio
```

## Verification

Run the same checks that CI runs before finishing a feature:

```bash
npm run verify
```

The verify flow runs unit tests, E2E tests, and the dependency security audit:

```bash
npm test
npm run test:e2e
npm run security:audit
```

The security audit fails on moderate and high vulnerabilities unless an advisory is explicitly allowlisted in `audit-ci.json`.

## Architecture

The project uses screaming architecture. Top-level folders under `src/` are business domains (`auth`, `me`, `groups`, `expenses`, `settlements`) plus explicit cross-cutting infrastructure (`shared`, `config`, `prisma`). Domain logic is organized behind use cases, ports, adapters, DTOs, and Prisma-backed persistence.
