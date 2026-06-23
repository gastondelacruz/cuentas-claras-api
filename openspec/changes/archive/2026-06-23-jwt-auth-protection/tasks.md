# Tasks: JWT Auth Protection

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 500-700 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 auth guard/Swagger/public routes; PR 2 userId threading + mappers; PR 3 e2e/verification |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: size-exception
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Secure auth surface and public routes | PR 1 | `AuthModule`, `AppModule`, `JwtStrategy`, `JwtAuthGuard`, `@Public()`, Swagger, health/auth controllers. |
| 2 | Thread `userId` through domain/http layers | PR 2 | Groups, expenses, me use cases/controllers/specs; `group.mapper.ts`; remove `DEV_USER_ID` runtime use. |
| 3 | Prove auth end-to-end | PR 3 | Shared e2e auth helper, protected 401/200 coverage, update existing e2e specs, run full verification. |

## Phase 1: Foundation / Infrastructure

- [x] 1.1 Create `src/shared/decorators/public.decorator.ts`, `src/auth/infrastructure/security/jwt.strategy.ts`, and `src/auth/infrastructure/security/jwt-auth.guard.ts`; add unit tests for JWT validation and `@Public()` bypass.
- [x] 1.2 Update `src/auth/auth.module.ts` and `src/app.module.ts` to register Passport, export strategy, and apply `APP_GUARD` globally; add `@Public()` to `src/auth/infrastructure/http/auth.controller.ts` and `src/health/health.controller.ts`.
- [x] 1.3 Update `src/main.ts` and protected controllers with `addBearerAuth()`/`@ApiBearerAuth()` so Swagger shows bearer auth on secured routes.

## Phase 2: Core Implementation

- [x] 2.1 Change groups use cases and `src/groups/infrastructure/http/groups.controller.ts` to accept `userId` first via `@CurrentUser("userId")`; update affected specs for the new signatures.
- [x] 2.2 Change expenses use cases and `src/expenses/infrastructure/http/expenses.controller.ts` to accept `userId` first; cover the user-scoped validation risk in specs for create/update/delete/detail flows.
- [x] 2.3 Change `src/me/application/use-cases/get-me-summary.use-case.ts` and `src/me/infrastructure/http/me.controller.ts` to require `userId`; remove any fallback assumptions.
- [x] 2.4 Fix `src/groups/infrastructure/http/mappers/group.mapper.ts` to receive `userId` for `isCurrentUser`, and remove runtime `DEV_USER_ID` references from `src/` (keep seed-only if needed).

## Phase 3: Testing / Verification

- [x] 3.1 Add `test/helpers/auth.helper.ts` with `registerAndLogin(app)` and update protected e2e specs to use Bearer tokens.
- [x] 3.2 Add/adjust e2e coverage for unauthenticated `401` vs authenticated `200` on groups, expenses, me, and health/public routes.
- [x] 3.3 Run `npm run test` then `npm run test:e2e`; fix only regressions required to satisfy the new auth boundary.

## Phase 4: Cleanup / Documentation

- [x] 4.1 Remove obsolete `DEV_USER_ID` runtime code paths and update any stale comments/docs in touched files.
