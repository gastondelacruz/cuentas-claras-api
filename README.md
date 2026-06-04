# cuentas-claras-api

NestJS REST API skeleton for Cuentas Claras, a shared-expenses app.

## Stack

- NestJS + TypeScript
- PostgreSQL
- Prisma ORM
- `@nestjs/config`
- `class-validator` / `class-transformer`
- Swagger at `/docs`

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

## Prisma commands

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio
```

## Architecture

The project uses screaming architecture. Top-level folders under `src/` are business domains (`auth`, `users`, `groups`, `expenses`, `settlements`) plus explicit cross-cutting infrastructure (`shared`, `config`, `prisma`). Domain business logic and CRUD endpoints are intentionally not implemented in this bootstrap stage.
