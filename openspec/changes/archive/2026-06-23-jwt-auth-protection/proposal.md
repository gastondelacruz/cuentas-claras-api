# Proposal: JWT Auth Protection

## Intent

All API routes are currently unprotected: every request runs as a hardcoded `DEV_USER_ID`. This means **any caller can read or mutate any user's data without authentication**. The change activates the JWT access-token gate that was partially built (tokens are issued on login, but never validated on subsequent requests) and threads the real `userId` through all use cases.

## Scope

### In Scope
- `JwtStrategy` + `JwtAuthGuard` in `src/auth/infrastructure/security/`
- Global guard registration via `APP_GUARD` in `AppModule`
- `@Public()` decorator for `/auth/register`, `/auth/login`, `HealthController`
- `userId` parameter added to `execute()` of all 14 affected use cases (groups ×8, expenses ×4, me ×1) + `group.mapper.ts` fix
- `DEV_USER_ID` removed from all runtime paths (seed script only)
- Swagger bearer scheme + `@ApiBearerAuth()` on protected controllers
- Unit test updates for refactored use cases; e2e updates to use `Authorization: Bearer <token>`

### Out of Scope
- Refresh token logic
- Role-based authorization
- New auth endpoints

## Capabilities

### New Capabilities
- `jwt-strategy`: PassportStrategy that validates access tokens and populates `request.user`
- `jwt-auth-guard`: NestJS guard that rejects missing/invalid tokens with 401 and respects `@Public()`

### Modified Capabilities
- `groups`: use cases now receive `userId` param; no longer rely on `DEV_USER_ID`
- `expenses`: same pattern as groups
- `me`: `get-me-summary` receives `userId` param

## Approach

1. **JwtStrategy** (`src/auth/infrastructure/security/jwt.strategy.ts`) — extends `PassportStrategy(Strategy)`, injects `authConfig` to read `JWT_ACCESS_SECRET`, validates payload shape `{ sub, email }`, returns `{ userId: sub, email }`.
2. **JwtAuthGuard** (`src/auth/infrastructure/security/jwt-auth.guard.ts`) — extends `AuthGuard('jwt')`, reads `IS_PUBLIC_KEY` metadata via `Reflector`; bypasses validation for public routes.
3. **APP_GUARD** — add to `AuthModule` providers so it's available when registered globally in `AppModule`.
4. **`@Public()`** — `src/shared/decorators/public.decorator.ts` sets `IS_PUBLIC_KEY` metadata.
5. **Use-case refactor** — add `userId: string` as first param to `execute()`. Controllers extract it via `@CurrentUser('sub') userId: string` and pass it through. `group.mapper.ts` hardcoded value removed.
6. **E2E helper** — shared `auth-helper.ts` in `test/` that registers + logs in a user, returns bearer token for test suites.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/auth/infrastructure/security/jwt.strategy.ts` | New | Passport JWT strategy |
| `src/auth/infrastructure/security/jwt-auth.guard.ts` | New | Global auth guard |
| `src/auth/auth.module.ts` | Modified | Export guard + provide APP_GUARD |
| `src/app.module.ts` | Modified | Register APP_GUARD |
| `src/shared/decorators/public.decorator.ts` | New | `@Public()` decorator |
| `src/shared/constants/dev-user.ts` | Removed (runtime) | DEV_USER_ID stays only in seed |
| `src/groups/application/use-cases/*.ts` (×8) | Modified | Add `userId` param to `execute()` |
| `src/groups/infrastructure/http/group.mapper.ts` | Modified | Remove hardcoded DEV_USER_ID |
| `src/groups/infrastructure/http/groups.controller.ts` | Modified | Inject `@CurrentUser('sub')` |
| `src/expenses/application/use-cases/*.ts` (×4) | Modified | Add `userId` param to `execute()` |
| `src/expenses/infrastructure/http/expenses.controller.ts` | Modified | Inject `@CurrentUser('sub')` |
| `src/me/application/use-cases/get-me-summary.use-case.ts` | Modified | Add `userId` param |
| `src/me/infrastructure/http/me.controller.ts` | Modified | Inject `@CurrentUser('sub')` |
| `src/main.ts` / Swagger setup | Modified | Add bearer security scheme |
| `test/*.e2e-spec.ts` (non-auth, ×6) | Modified | Add bearer token to requests |
| `test/auth-helper.ts` | New | Shared e2e auth utility |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| All non-auth e2e tests fail on guard activation | High | Implement auth helper + update e2e specs in same PR |
| `group.mapper.ts` hardcoded `DEV_USER_ID` missed by search | Medium | Explicit file listed in tasks; unit test will catch missing userId |
| `JwtModule.register({})` has no secret — strategy can't validate | Medium | JwtStrategy self-injects `authConfig` directly (no module-level secret needed) |
| `@CurrentUser` decorator returns wrong field if payload shape changes | Low | Payload is `{ sub, email }` — use `@CurrentUser('sub')` consistently |

## Rollback Plan

1. Remove `APP_GUARD` from `AppModule`.
2. Restore `DEV_USER_ID` import in affected use cases and controllers.
3. Revert `group.mapper.ts` to hardcoded value.
4. No DB migration needed — purely application-layer change.

## Dependencies

- `@nestjs/passport`, `passport-jwt`, `@types/passport-jwt` already installed — no new deps.
- `JWT_ACCESS_SECRET` already validated in `env.validation.ts`.

## Success Criteria

- [ ] `GET /groups` without token → 401
- [ ] `GET /groups` with valid access token → 200, data scoped to token's userId
- [ ] `POST /auth/login` and `POST /auth/register` → 200 without token (public routes)
- [ ] `GET /health` → 200 without token
- [ ] All unit tests pass (`npm test`)
- [ ] All e2e tests pass (`npm run test:e2e`)
- [ ] No `DEV_USER_ID` import outside `prisma/seed.ts`
