# Tasks: Auth Registration

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 650-900 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: deps + config + Prisma; PR 2: auth domain/use case/tests; PR 3: infra + HTTP + E2E |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Foundation and schema | PR 1 | Base branch = main; includes deps, config, Prisma, migration. |
| 2 | Core registration logic | PR 2 | Base branch = PR 1; include red/green unit tests for use case. |
| 3 | API wiring and regression coverage | PR 3 | Base branch = PR 2; include adapters, module, controller, E2E. |

## Phase 1: Foundation

- [x] 1.1 Add `@nestjs/jwt`, `argon2`, `@nestjs/passport`, `passport`, `passport-jwt`, `@types/passport-jwt`, `google-auth-library` to `package.json`; acceptance: install succeeds and lockfile updates cleanly.
- [x] 1.2 Update `prisma/schema.prisma` with nullable `passwordHash`/`googleId` on `User` and new `RefreshToken`; acceptance: `prisma generate` succeeds and schema diff is additive.
- [x] 1.3 Create `prisma/migrations/*_add_auth_registration/migration.sql`; acceptance: migration applies on a clean database.
- [x] 1.4 Add `src/config/auth.config.ts`, extend `src/config/env.validation.ts`, and document vars in `.env.example`; acceptance: test env boots with defaults and prod env requires secrets.

## Phase 2: Core Registration

- [x] 2.1 Create auth domain ports in `src/auth/domain/ports/`; acceptance: ports are abstract classes only and cover user, password, token, and refresh-token contracts.
- [x] 2.2 Write failing `src/auth/application/use-cases/register.use-case.spec.ts`; acceptance: covers happy path, duplicate email, and hashed-password/token persistence expectations.
- [x] 2.3 Implement `src/auth/application/use-cases/register.use-case.ts`; acceptance: returns access/refresh tokens plus user and throws `EMAIL_ALREADY_EXISTS` on duplicates.

## Phase 3: Infrastructure and HTTP Wiring

- [x] 3.1 Add security and persistence adapters under `src/auth/infrastructure/`; acceptance: Argon2 and Prisma implementations satisfy the ports and never expose plaintext passwords.
- [x] 3.2 Wire `src/auth/auth.module.ts` and import it from `src/app.module.ts`; acceptance: Nest compiles with DI bindings resolved from ports to adapters.
- [x] 3.3 Add `src/auth/infrastructure/http/` DTOs, controller, and mapper; acceptance: `POST /api/v1/auth/register` returns `201` with `{ data: { accessToken, refreshToken, user } }`.

## Phase 4: Verification

- [x] 4.1 Add `test/auth.e2e-spec.ts` for happy path, duplicate email, and validation errors; acceptance: response status and body match spec.
- [x] 4.2 Verify stored user password is hashed and refresh token is hashed in the database; acceptance: E2E checks inspect persisted rows, not raw tokens.
- [x] 4.3 Run `npm test`, `npm run test:e2e`, and Prisma generate/migrate commands; acceptance: all commands pass locally before handoff.
