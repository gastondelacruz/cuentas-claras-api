# Verification Report: auth-registration

**Change**: `auth-registration`  
**Mode**: Hybrid persistence, Strict TDD  
**Verified at**: 2026-06-22  
**Verdict**: **PASS WITH WARNINGS**

## Completeness

| Metric | Value |
|--------|-------|
| Required artifacts read | OpenSpec spec, design, tasks, current verify-report; Engram spec, design, tasks, apply-progress, previous verify-report |
| OpenSpec tasks total | 13 |
| OpenSpec tasks complete | 13 |
| OpenSpec tasks incomplete | 0 |
| Engram tasks artifact state | 12/13 complete; stale `4.3` checkbox still unchecked in Engram topic `sdd/auth-registration/tasks` |
| Commands executed during re-verify | `npm test`, `npm run build`, `npm run test:e2e`, `npm run test:cov` |

The previous critical finding is fixed. Runtime coverage now decodes the access-token JWT `exp` and asserts a 15-minute TTL, asserts refresh-token `expiresAt` exactly 30 days from issuance, and verifies `PasswordHasher.verify(plain, hashed)` behavior.

## Build & Tests Execution

| Command | Result | Evidence |
|---------|--------|----------|
| `npm test` | ✅ Passed | 36 files / 142 tests passed. Includes `src/auth/infrastructure/security/jwt-token.service.spec.ts`, `argon2-password-hasher.spec.ts`, and `register.use-case.spec.ts`. |
| `npm run build` | ✅ Passed | `nest build` exited successfully. |
| `npm run test:e2e` | ✅ Passed | 8 files / 71 tests passed. Includes `test/auth.e2e-spec.ts` and migration deploy applying `20260622150000_add_auth_registration`. |
| `npm run test:cov` | ✅ Passed | 36 files / 142 tests passed with V8 coverage. Overall unit coverage: 58.75% statements, 51.94% branches, 58.94% lines. |

## Spec Compliance Matrix

| Requirement | Scenario | Covering runtime evidence | Result |
|-------------|----------|---------------------------|--------|
| Register Endpoint | Happy path — valid registration | `test/auth.e2e-spec.ts` posts to `/api/v1/auth/register`, expects 201 and `{ data: { accessToken, refreshToken, user } }`; `npm run test:e2e` passed. | ✅ COMPLIANT |
| Register Endpoint | `passwordHash` absent from response | `test/auth.e2e-spec.ts` asserts `response.body.data.user.passwordHash` is undefined; `npm run test:e2e` passed. | ✅ COMPLIANT |
| Email Uniqueness | Duplicate email | `test/auth.e2e-spec.ts` seeds `taken@example.com`, expects 409 and `EMAIL_ALREADY_EXISTS`; `npm run test:e2e` passed. | ✅ COMPLIANT |
| Input Validation | Invalid email format | `test/auth.e2e-spec.ts` invalid payload loop includes invalid email and expects 400; `npm run test:e2e` passed. | ✅ COMPLIANT |
| Input Validation | Missing password | `test/auth.e2e-spec.ts` invalid payload loop includes missing password and expects 400; `npm run test:e2e` passed. | ✅ COMPLIANT |
| Input Validation | Password too short | `test/auth.e2e-spec.ts` invalid payload loop includes short password and expects 400; `npm run test:e2e` passed. | ✅ COMPLIANT |
| Input Validation | Missing name | `test/auth.e2e-spec.ts` invalid payload loop includes missing and blank name and expects 400; `npm run test:e2e` passed. | ✅ COMPLIANT |
| Secure Password Storage | Password hashed before storage | `register.use-case.spec.ts` verifies hashing before persistence; `test/auth.e2e-spec.ts` verifies stored hash differs from plaintext and `argon2.verify()` succeeds; commands passed. | ✅ COMPLIANT |
| Token Issuance | Tokens issued with correct TTLs | `register.use-case.spec.ts` verifies token service calls and response tokens; `jwt-token.service.spec.ts` decodes JWT `exp` and asserts access-token TTL is 15 minutes; it also asserts refresh JWT TTL and `expiresAt` are 30 days. | ✅ COMPLIANT |
| Refresh Token Persistence | Refresh token stored as hash | `register.use-case.spec.ts` verifies `RefreshTokenRepository.save({ userId, tokenHash, expiresAt })`; `test/auth.e2e-spec.ts` verifies DB token hash differs from raw token and `argon2.verify()` succeeds. | ✅ COMPLIANT |

**Compliance summary**: 10/10 scenario checks compliant under Strict TDD.

## Correctness Static Evidence

| Area | Status | Evidence |
|------|--------|----------|
| Registration endpoint | ✅ Implemented | `src/auth/infrastructure/http/auth.controller.ts` exposes `POST api/v1/auth/register`. |
| DTO validation | ✅ Implemented | `RegisterRequestDto` uses `@IsEmail`, `@IsString`, `@MinLength(8)`, `@IsNotEmpty`, and transforms email/name. |
| Duplicate email behavior | ✅ Implemented | `RegisterUseCase` throws `BusinessException("EMAIL_ALREADY_EXISTS", ..., 409)` when `findByEmail()` returns a user. |
| Token response shape | ✅ Implemented | `AuthMapper.toRegisterResponseDto()` returns `accessToken`, `refreshToken`, and `user: { id, name, email }`; global interceptor wraps as `{ data }`. |
| Password persistence | ✅ Implemented | `RegisterUseCase` hashes plaintext before `createWithPassword`; Prisma repository selects only `{ id, name, email }`. |
| Refresh token persistence | ✅ Implemented | `RegisterUseCase` hashes raw refresh token before `RefreshTokenRepository.save()`. |
| JWT TTL implementation | ✅ Implemented and covered | `JwtTokenService` signs with config-driven TTLs and computes refresh `expiresAt`; `jwt-token.service.spec.ts` asserts 15m access and 30d refresh behavior. |
| `PasswordHasher.verify()` contract | ✅ Implemented and covered | Port and adapter declare `verify(plain, hashed)`; `argon2-password-hasher.spec.ts` verifies matching and mismatched plaintext against a generated hash. |
| Prisma schema | ✅ Implemented | `User.passwordHash`, `User.googleId`, and `RefreshToken` model match the spec plus design's additional `expiresAt` index. |
| Migration | ✅ Applies | `npm run test:e2e` applied `20260622150000_add_auth_registration` through `prisma migrate deploy` successfully. |
| Config | ✅ Implemented | `auth.config.ts`, env validation, `AuthModule` `ConfigModule.forFeature(authConfig)`, and `.env.example` are present. |

## Architecture and Design Coherence

| Decision / Constraint | Followed? | Evidence |
|-----------------------|-----------|----------|
| Hexagonal `src/auth` module | ✅ Yes | Domain ports, application use case, infrastructure adapters, HTTP DTO/controller/mapper, and `auth.module.ts` exist. |
| Abstract-class ports as DI tokens | ✅ Yes | `AuthUserRepository`, `PasswordHasher`, `RefreshTokenRepository`, and `TokenService` are abstract classes. |
| Dependency direction | ✅ Yes | Use case depends on domain ports only; adapters depend inward; HTTP maps through `AuthMapper`. |
| Nest module wiring | ✅ Yes | `AuthModule` binds ports to adapters with `useExisting` and is imported from `AppModule`. |
| Prisma adapter boundaries | ✅ Yes | Prisma access is inside persistence adapters; user repository returns only auth user projection. |
| Business/database exception style | ✅ Yes | Duplicate email uses `BusinessException`; Prisma failures are wrapped in `DatabaseException` with stable codes. |
| Preserve `DEV_USER_ID` stub | ✅ Yes | Existing `DEV_USER_ID` behavior remains out of scope. |
| No out-of-scope login/OAuth/guards | ✅ Yes | The auth slice implements registration/token issuance only. |
| Design artifact signature for `PasswordHasher.verify()` | ⚠️ Drift | The spec and code use `verify(plain, hashed)`, but `design.md` still documents `verify(hash, plain)`. Specs win, and implementation correctly follows the spec. |

## Prisma Compliance

| Contract | Status | Notes |
|----------|--------|-------|
| `User.passwordHash String? @map("password_hash")` | ✅ | Present in schema and migration. |
| `User.googleId String? @unique @map("google_id")` | ✅ | Present in schema and migration. |
| `RefreshToken` model/table | ✅ | Present with `userId`, `tokenHash`, `expiresAt`, `revokedAt`, timestamps, cascade relation, and indexes. |
| Migration additive | ✅ | Adds nullable user columns and creates `refresh_tokens`; no destructive changes found. |
| Migration execution | ✅ | `npm run test:e2e` applied all migrations successfully in Testcontainers. |

## Config Compliance

| Contract | Status | Notes |
|----------|--------|-------|
| `registerAs("auth")` | ✅ | Implemented in `src/config/auth.config.ts`. |
| Required JWT secrets | ✅ | Joi requires min length 32 outside test and supplies test defaults. |
| TTL defaults | ✅ | `JWT_ACCESS_TTL` defaults to `15m`; `JWT_REFRESH_TTL` defaults to `30d`. |
| TTL validation | ✅ | Joi pattern restricts TTLs to `s/m/h/d` units. |
| App module registration | ✅ | `AuthModule` imported by `AppModule`; `AuthModule` registers auth config with `forFeature`. |
| `.env.example` | ✅ | Documents auth variables. |

## Strict TDD Compliance

| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | ✅ | `apply-progress` includes a `TDD Cycle Evidence` table, including the TTL fix and `PasswordHasher.verify()` fix. |
| All tasks have tests | ✅ | Unit and E2E test files exist for behavior-bearing work; structural tasks are covered by compile/E2E boot. |
| RED confirmed | ✅ | Reported test files exist: `register.use-case.spec.ts`, `test/auth.e2e-spec.ts`, `jwt-token.service.spec.ts`, `argon2-password-hasher.spec.ts`. |
| GREEN confirmed | ✅ | `npm test` and `npm run test:e2e` both passed during re-verification. |
| Triangulation adequate | ✅ | Happy path, duplicate, validation variants, hash persistence, TTL behavior, and verify behavior are covered by distinct assertions. |
| Safety net for modified files | ✅ | Apply-progress reports baseline and focused fix cycles; full unit/build/E2E suites pass now. |
| Tasks artifact complete | ⚠️ | OpenSpec `tasks.md` is complete, but Engram topic `sdd/auth-registration/tasks` is stale with `4.3` unchecked. |

**TDD compliance**: 6/7 checks passed; 1 artifact-sync warning.

## Test Layer Distribution

| Layer | Tests | Files | Tools |
|-------|-------|-------|-------|
| Unit | 6 auth-related tests | 3 files | Vitest + Nest TestingModule / direct adapter tests |
| E2E | 3 auth scenarios covering registration, duplicate, validation, persisted password hash, persisted refresh hash | 1 file | Vitest + Supertest + Testcontainers PostgreSQL |
| Migration E2E | 2 existing schema tests | 1 file | Vitest + Testcontainers + `prisma migrate deploy` |
| **Total related** | **11 tests** | **5 files** | |

## Changed File Coverage

Coverage evidence comes from `npm run test:cov` and represents unit-test instrumentation only. E2E runtime coverage is not included in the V8 coverage summary.

| File / Group | Line % | Branch % | Uncovered Lines | Rating |
|--------------|--------|----------|-----------------|--------|
| `src/auth/application/use-cases/register.use-case.ts` | 100% | 100% | — | ✅ Excellent |
| `src/auth/infrastructure/security/jwt-token.service.ts` | 90.9% | 50% | 48 | ⚠️ Acceptable; happy TTL paths covered, invalid TTL branch uncovered |
| `src/auth/infrastructure/security/argon2-password-hasher.ts` | 75% | 100% | 15 | ⚠️ Low; invalid-hash catch branch uncovered |
| `src/auth/infrastructure/http/auth.controller.ts` | 0% | 100% | 11-22 | ⚠️ Low unit coverage; E2E covers runtime behavior |
| `src/auth/infrastructure/http/mappers/auth.mapper.ts` | 0% | 100% | 10-18 | ⚠️ Low unit coverage; E2E covers response mapping behavior |
| `src/auth/infrastructure/persistence/*.ts` | 0% | 0% | Repository methods | ⚠️ Low unit coverage; E2E covers DB behavior |
| `src/config/auth.config.ts` / `env.validation.ts` | 0% | 0-100% | Config factory/schema | ⚠️ Low unit coverage; build/E2E boot validates config for this slice |

## Assertion Quality

**Assertion quality**: ✅ All reviewed assertions verify real behavior.

Reviewed `register.use-case.spec.ts`, `jwt-token.service.spec.ts`, `argon2-password-hasher.spec.ts`, and `test/auth.e2e-spec.ts`. No tautologies, ghost loops, production-less assertions, or smoke-test-only assertions were found. The invalid-payload E2E loop iterates over a fixed non-empty literal array and performs a real HTTP request for each case.

## Quality Metrics

**Linter**: ➖ Not available as an npm script.  
**Type Checker / Build**: ✅ `npm run build` passed.  
**Coverage**: ✅ `npm run test:cov` passed; low auth infrastructure/config unit coverage remains informational because E2E covers the runtime flow.

## Issues Found

### CRITICAL

None.

### WARNING

1. **Hybrid artifact drift: Engram tasks are stale** — OpenSpec `tasks.md` now has all 13 tasks checked, but Engram topic `sdd/auth-registration/tasks` still shows `4.3` unchecked.
2. **Design artifact drift for `PasswordHasher.verify()`** — OpenSpec `design.md` still documents `verify(hash, plain)`, while the spec, port, adapter, and tests correctly use `verify(plain, hashed)`.
3. **Low unit coverage remains for HTTP/persistence/config auth files** — E2E covers the registration flow, but unit coverage remains low for adapters, controller, mapper, and config branches.

### SUGGESTION

1. Sync the Engram `sdd/auth-registration/tasks` artifact with the current OpenSpec `tasks.md` before archive.
2. Update `openspec/changes/auth-registration/design.md` during archive/design-sync so the `PasswordHasher.verify()` signature matches the spec and implementation.
3. Consider mapping Prisma unique constraint failures on user creation to `EMAIL_ALREADY_EXISTS` so concurrent duplicate registrations return 409 instead of a generic database error.
4. Consider extending schema E2E coverage to assert the `refresh_tokens` table and key columns exist after `prisma migrate deploy`.

## Verdict

**PASS WITH WARNINGS**

All required runtime commands passed, all spec scenarios have passing covering tests, and the prior TTL and `PasswordHasher.verify()` critical findings are fixed. Remaining issues are artifact/documentation sync and non-blocking coverage improvements.
