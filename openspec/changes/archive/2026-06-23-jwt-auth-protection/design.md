# Design: JWT Auth Protection

## Technical Approach

Activate Nest Passport JWT as a global opt-out guard. `JwtStrategy` validates access tokens with injected `authConfig` (`jwtAccessSecret` in current code), sets `request.user = { userId: payload.sub, email: payload.email }`, and every protected controller threads `@CurrentUser("userId")` into use cases. `DEV_USER_ID` is removed from `src/` runtime code; only seed data may keep it.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| JWT validation | `JwtStrategy extends PassportStrategy(Strategy, "jwt")`, `ExtractJwt.fromAuthHeaderAsBearerToken()`, `ignoreExpiration: false`, `secretOrKey: config.jwtAccessSecret`; `validate()` returns `{ userId, email }`. | Manual JWT parsing in a guard; configuring only `JwtModule.register()`. | Passport centralizes 401 behavior and token extraction; current token service already self-injects config secrets. |
| Global auth | `JwtAuthGuard extends AuthGuard("jwt")`, injects `Reflector`, bypasses `IS_PUBLIC_KEY` from handler/class, otherwise `super.canActivate(context)`. | Per-controller guards. | Secure by default; `@Public()` documents anonymous routes. |
| Public API | `@Public()` + `IS_PUBLIC_KEY` in `src/shared/decorators/public.decorator.ts`; apply only auth register/login and health. | Whitelist inside guard. | Metadata is testable and keeps route intent near handlers. |
| User context | Controllers use `@CurrentUser("userId") userId: string`; use cases become `execute(userId: string, ...rest)`. | Use `sub` in controllers. | Strategy returns `userId`, so controller keys must match runtime shape. |
| `group.mapper.ts` | Thread `userId` into `GroupMapper.toDetailResponseDto(group, userId)` for `isCurrentUser`. | Remove `isCurrentUser`. | DTO exposes `isCurrentUser`; mapper needs request context, not a hardcoded constant. |
| Swagger | Keep/add `addBearerAuth()` in `main.ts`; add `@ApiBearerAuth()` to protected controllers. | Method-level annotations. | Controller-level decorators are less noisy and match global protection. |

## Data Flow

```text
Request -> JwtAuthGuard -> @Public? -> Passport jwt -> JwtStrategy.validate
        -> request.user { userId, email }
        -> Controller @CurrentUser("userId") -> UseCase(userId, input)
        -> Repository scoped query -> Mapper(userId where needed) -> Response
```

Before/after example:

```ts
// before
await this.listGroupsUseCase.execute(); // use case reads DEV_USER_ID
// after
async list(@CurrentUser("userId") userId: string) {
	const groups = await this.listGroupsUseCase.execute(userId);
}
```

## File Changes

| File | Action | Purpose |
|---|---|---|
| `src/auth/infrastructure/security/jwt.strategy.ts` | Create | Passport JWT strategy using bearer tokens and `authConfig.jwtAccessSecret`. |
| `src/auth/infrastructure/security/jwt-auth.guard.ts` | Create | Global guard with `@Public()` bypass. |
| `src/shared/decorators/public.decorator.ts` | Create | `IS_PUBLIC_KEY` metadata decorator. |
| `src/auth/auth.module.ts` | Modify | Import `PassportModule`; provide/export `JwtStrategy`, keep `JwtModule.register({})`. |
| `src/app.module.ts` | Modify | Register `{ provide: APP_GUARD, useClass: JwtAuthGuard }`. |
| `src/auth/infrastructure/http/auth.controller.ts`, `src/health/health.controller.ts` | Modify | Add `@Public()`. |
| `src/groups/infrastructure/http/groups.controller.ts`, `src/expenses/infrastructure/http/expenses.controller.ts`, `src/me/infrastructure/http/me.controller.ts` | Modify | Add `@ApiBearerAuth()`, inject userId, pass first arg. |
| `src/groups/application/use-cases/{create,list,get-detail,update,archive,get-balances,get-settlements,record-settlement-payment}.use-case.ts` | Modify | Replace `DEV_USER_ID` with first `userId` parameter. |
| `src/expenses/application/use-cases/{create,list,get-detail,update,delete}-expense.use-case.ts` | Modify | Accept userId; scope member lookup/detail/update/delete through repositories. |
| `src/me/application/use-cases/get-me-summary.use-case.ts` | Modify | Accept userId and pass to repository. |
| `src/groups/infrastructure/http/mappers/group.mapper.ts` | Modify | Remove inline `DEV_USER_ID`; accept userId for detail mapping. |
| `src/expenses/domain/ports/expense.repository.ts`, `src/expenses/infrastructure/persistence/prisma-expense.repository.ts` | Modify | Add/use user-scoped active-member lookup for create/update validation. |
| `src/shared/constants/dev-user.ts` | Delete | Remove runtime constant after all references leave `src/`. |
| `test/helpers/auth.helper.ts` | Create | Register/login unique user, return `{ accessToken, userId }`. |
| `test/{groups,expenses,group-balances,group-settlements,me-summary}.e2e-spec.ts` | Modify | Use helper and `.set("Authorization", `Bearer ${accessToken}`)`. |
| Affected `src/**/*.spec.ts` | Modify | Red tests first for new `execute(userId, ...)` signatures and no `DEV_USER_ID`. |

## Interfaces / Contracts

```ts
type JwtRequestUser = { userId: string; email: string };
execute(userId: string, inputOrId: ...): Promise<...>;
registerAndLogin(app): Promise<{ accessToken: string; userId: string }>;
```

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Use-case `userId` is forwarded to repos; guard public bypass and protected delegation. | Red specs first; mock repos/Reflector. |
| Integration | `JwtStrategy.validate()` maps `{ sub, email }` to `{ userId, email }`. | Strategy unit or Nest testing module. |
| E2E | Public register/login/health; protected 401 without token, 200 with helper token. | Update protected specs and add focused guard coverage. |

## Migration / Rollout

No database migration required. Roll out in one PR because enabling the global guard and updating E2E auth headers are coupled.

## Open Questions

- [ ] None.
