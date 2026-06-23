# Archive Report: auth-login

**Change**: auth-login
**Archived**: 2026-06-23
**Branch**: feature/auth-email-password-login
**Verdict**: ✅ PASS — archived with no warnings

## Executive Summary

Implemented email/password login (`POST /api/v1/auth/login`) on top of the existing auth-registration hexagon. The feature adds a `LoginUseCase` that normalizes the submitted email, looks up the user via a new `findByEmailForLogin` projection that safely exposes `passwordHash` only within the use case, verifies the Argon2 hash, issues the same token pair as registration, and persists a newly hashed refresh token. All credential failures (nonexistent user, no password hash, wrong password) are collapsed into a single generic `INVALID_CREDENTIALS` error to prevent account enumeration.

## What Was Built

| Item | Description |
|------|-------------|
| `POST /api/v1/auth/login` | New HTTP endpoint returning `200` with `{ data: { accessToken, refreshToken, user } }` |
| `LoginUseCase` | Application use case: email normalization, Argon2 verification, token issuance, refresh-token persistence |
| `AuthLoginUser` type | Additive projection `AuthUser & { passwordHash: string \| null }` — not merged into `AuthUser` |
| `findByEmailForLogin()` | New repository port method; Prisma adapter selects `passwordHash` only for this path |
| `LoginRequestDto` | DTO with `@Transform` trim+lowercase on email, `@IsEmail`, `@IsString` on password |
| `toLoginInput` / `toLoginResponseDto` | Mapper methods; response reuses `RegisterResponseDto` (same shape) |
| Swagger metadata | `@ApiOkResponse` on login route |
| Unit tests | 4 cases: success, wrong password, nonexistent email, Google-only/no-hash |
| E2E tests | 4 cases: 200 success, 401 wrong password, 401 nonexistent, 400 invalid payloads |

## Files Changed

| File | Change |
|------|--------|
| `src/auth/application/use-cases/login.use-case.ts` | Created |
| `src/auth/application/use-cases/login.use-case.spec.ts` | Created |
| `src/auth/infrastructure/http/dto/login-request.dto.ts` | Created |
| `src/auth/domain/ports/auth-user.repository.ts` | Modified — added `AuthLoginUser` type and `findByEmailForLogin` |
| `src/auth/infrastructure/persistence/prisma-auth-user.repository.ts` | Modified — added `findByEmailForLogin` implementation |
| `src/auth/infrastructure/http/mappers/auth.mapper.ts` | Modified — added `toLoginInput` and `toLoginResponseDto` |
| `src/auth/infrastructure/http/auth.controller.ts` | Modified — added `POST /login` route |
| `src/auth/auth.module.ts` | Modified — registered `LoginUseCase` provider |
| `test/auth.e2e-spec.ts` | Modified — added 4 login E2E scenarios |

## Test Coverage

| Suite | Count | Result |
|-------|-------|--------|
| Unit (`npm test`) | 146/146 | ✅ ALL PASS |
| E2E (`npm run test:e2e`) | 75/75 | ✅ ALL PASS |
| Registration regression | 3/3 | ✅ No regressions |

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| `AuthLoginUser` as additive type, not merged into `AuthUser` | Keeps `passwordHash` out of `AuthUser` domain shape and HTTP response by construction |
| Single `rejectInvalidCredentials()` private helper | One call site for all 3 failure branches — enumeration leak impossible |
| `findByEmailForLogin` separate from `findByEmail` | Registration path stays unchanged; `passwordHash` only accessible to the login projection |
| Response reuses `RegisterResponseDto` | Consistent token pair + user shape across both auth flows |
| Refresh token NOT revoked on login | Matches out-of-scope decision; multi-device sessions preserved |

## Architecture Compliance

- `LoginUseCase` imports only domain ports and `BusinessException` — no NestJS HTTP, Prisma, or JWT direct dependencies
- Dependency direction: infrastructure → application → domain — no cross-layer leaks
- DTO in `infrastructure/http`, mapper in `infrastructure/http`, use case in `application/use-cases`

## Deviations from Design

None. All 8 planned file changes (3 created, 5 modified) match `design.md` exactly.

## Open Items / Known Issues

| Item | Severity | Notes |
|------|----------|-------|
| Docker socket path for E2E (`DOCKER_HOST=unix://$HOME/.docker/run/docker.sock`) | Pre-existing | Required only on non-standard Docker Desktop installs; not introduced by this change |
| Pre-existing TS errors in unrelated spec files | Pre-existing | Not introduced by auth-login; no impact on test execution |

## Engram Artifact Observation IDs

| Artifact | Observation ID |
|----------|---------------|
| proposal | #529 |
| spec | #530 |
| design | #531 |
| tasks | #532 |
| apply-progress | #533 |
| verify-report | #535 |
| archive-report | (saved in this archive cycle) |
