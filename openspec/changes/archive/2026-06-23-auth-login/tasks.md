# Tasks: Auth Login

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 260-360 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Add login use-case and repository projection | PR 1 | Base on `main`; include unit tests and port/persistence changes |
| 2 | Wire HTTP login endpoint and E2E coverage | PR 1 | Same PR; depends on Unit 1 and keeps contract tests with route |

## Phase 1: Foundation / Test-First Domain Shape

- [x] 1.1 Create failing unit tests in `src/auth/application/use-cases/login.use-case.spec.ts` for success, wrong password, nonexistent email, and Google-only/no-password-hash.
- [x] 1.2 Add failing repository contract assertions in `src/auth/domain/ports/auth-user.repository.ts` for `AuthLoginUser` and `findByEmailForLogin(email)`.
- [x] 1.3 Add failing persistence expectations in `src/auth/infrastructure/persistence/prisma-auth-user.repository.spec.ts` if needed, otherwise plan adapter coverage through use-case tests only.

## Phase 2: Core Implementation

- [x] 2.1 Implement `src/auth/application/use-cases/login.use-case.ts` with email normalization, generic `INVALID_CREDENTIALS`, token issuance, refresh-token hashing, and refresh-token persistence.
- [x] 2.2 Extend `src/auth/domain/ports/auth-user.repository.ts` and `src/auth/infrastructure/persistence/prisma-auth-user.repository.ts` to safely load `passwordHash` only for login.
- [x] 2.3 Keep `src/auth/infrastructure/http/mappers/auth.mapper.ts` response mapping aligned with registration and exclude `passwordHash`.

## Phase 3: HTTP / E2E Wiring

- [x] 3.1 Add `src/auth/infrastructure/http/dto/login-request.dto.ts` with validation, trimming, and lowercase email normalization.
- [x] 3.2 Update `src/auth/infrastructure/http/auth.controller.ts` and `src/auth/auth.module.ts` to expose `POST /api/v1/auth/login` and inject `LoginUseCase`.
- [x] 3.3 Extend `test/auth.e2e-spec.ts` for register-then-login success, `401 INVALID_CREDENTIALS`, response envelope, and refresh-token persistence.

## Phase 4: Verification / Cleanup

- [x] 4.1 Run `npm test` and fix any unit regressions until login and registration tests pass together.
- [x] 4.2 Run `npm run test:e2e` and verify the new login route, generic failures, and stored refresh-token behavior.
- [x] 4.3 Update any Swagger metadata or inline comments in `src/auth/infrastructure/http/` so the login contract is discoverable.
