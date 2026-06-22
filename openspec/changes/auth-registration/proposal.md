# Proposal: Auth Registration

## Intent

Implement email/password registration as the first auth slice. The API currently has zero authentication — every use-case hardcodes `DEV_USER_ID`. This change introduces the foundational auth infrastructure (schema, config, hexagonal module, token machinery) and the single `POST /api/v1/auth/register` endpoint. No existing behavior is altered; the `DEV_USER_ID` stub remains until a future login + guard wiring change.

## Scope

### In Scope
- Install `@nestjs/jwt`, `argon2`, `@nestjs/passport`, `passport`, `passport-jwt`, `@types/passport-jwt`, `google-auth-library`
- Prisma: `passwordHash String?`, `googleId String?` on `User`; new `RefreshToken` model; migration
- `src/config/auth.config.ts` (`registerAs("auth")`) + extend `env.validation.ts`; register in `app.module.ts`; update `.env.example`
- Hexagonal `src/auth/` module — domain ports, `RegisterUseCase`, infrastructure adapters, HTTP layer
- `POST /api/v1/auth/register` → `{ accessToken, refreshToken, user: { id, name, email } }`
- Unit test `register.use-case.spec.ts` (all ports mocked) + E2E `test/auth.e2e-spec.ts` (happy path + duplicate email)

### Out of Scope
- Login endpoint
- Google OAuth flow
- JWT guard wiring to existing modules
- Replacing `DEV_USER_ID` in existing use-cases

## Capabilities

### New Capabilities
- `auth-registration`: Email/password user registration — uniqueness check, argon2 hashing, token pair issuance, hashed refresh token persistence

### Modified Capabilities
- None

## Approach

Follow the repo's hexagonal pattern (identical to `groups`, `me`):

```
domain/ports/         → PasswordHasher, TokenService, AuthUserRepository, RefreshTokenRepository (abstract classes)
application/use-cases/ → RegisterUseCase
infrastructure/       → argon2 adapter, JWT adapter, Prisma repositories, AuthController + RegisterDto
auth.module.ts        → composition root binding ports → adapters
```

`RegisterUseCase` flow: `findByEmail` → throw `BusinessException(EMAIL_ALREADY_EXISTS, 409)` if exists → `hashPassword` → `createWithPassword` → `signAccessToken` + `signRefreshToken` → persist hashed refresh token → return token pair + user projection.

Config is loaded via `registerAs("auth")` and validated by Joi alongside existing env vars.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modified | Add `passwordHash`, `googleId` to `User`; add `RefreshToken` model |
| `src/config/auth.config.ts` | New | JWT secrets, TTLs, Google client ID |
| `src/config/env.validation.ts` | Modified | Add JWT and Google env vars to Joi schema |
| `src/app.module.ts` | Modified | Import `AuthModule`, register `AuthConfig` |
| `.env.example` | Modified | Add `JWT_ACCESS_SECRET`, `JWT_ACCESS_TTL`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_TTL`, `GOOGLE_CLIENT_ID` |
| `src/auth/` | New | Full hexagonal auth module (domain, application, infrastructure) |
| `test/auth.e2e-spec.ts` | New | E2E coverage for registration |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| argon2 native addon breaks Docker build | Med | Document required build tools; verify in CI before merge |
| RefreshToken migration conflicts with existing schema | Low | Apply `prisma migrate dev` in isolation; review generated SQL before applying |
| `passwordHash` nullable by design may surprise future devs | Low | Document in domain entity and port signatures |

## Rollback Plan

1. Drop the `auth-registration` migration (`prisma migrate resolve --rolled-back`).
2. Remove `src/auth/`, `src/config/auth.config.ts`, and the Joi additions — no existing module is modified except `app.module.ts` and `env.validation.ts`, both of which are trivially reverted.
3. Remove installed packages.

No existing endpoints or use-cases are touched, so rollback is isolated.

## Dependencies

- Docker + `node-gyp` build tools available in the build environment (argon2 native addon)
- PostgreSQL 17 running via `docker compose` with migration applied before E2E

## Success Criteria

- [ ] `POST /api/v1/auth/register` returns 201 with `{ data: { accessToken, refreshToken, user } }` on valid input
- [ ] Duplicate email returns 409 with stable error code `EMAIL_ALREADY_EXISTS`
- [ ] `npm test` passes with `register.use-case.spec.ts` at 100% branch coverage
- [ ] `npm run test:e2e` passes for `auth.e2e-spec.ts` happy path and duplicate email
- [ ] No existing unit or E2E tests regress
- [ ] `passwordHash` is never returned in any HTTP response
