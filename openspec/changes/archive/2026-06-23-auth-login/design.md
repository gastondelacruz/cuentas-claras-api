# Design: Auth Login

## Technical Approach

Add a login slice inside the existing `auth` hexagon without changing registration behavior. HTTP receives `POST /api/v1/auth/login`, maps a validated DTO to `LoginUseCase`, and the use case reuses the existing auth ports for password verification, token issuing, refresh-token hashing, and persistence. No schema change is required.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Login credential lookup | Add `AuthLoginUser` and `findByEmailForLogin(email)` to `AuthUserRepository` | Widen existing `findByEmail()` to include `passwordHash` | Keeps registration on the safe public user projection and limits password-hash visibility to the login use case. |
| Error handling | Throw `BusinessException("INVALID_CREDENTIALS", "Invalid credentials.", 401)` from `LoginUseCase` | Throw Nest `UnauthorizedException` or distinct errors | Preserves application-layer exception conventions and prevents account enumeration. |
| Response shape | Reuse `RegisterResponseDto` shape and mapper response fields | Rename to generic `AuthResponseDto` now | Avoids churn; login must match registration response exactly. |
| Refresh tokens | Persist one new hashed refresh token per successful login | Revoke old tokens | Matches scope; revocation belongs to a later slice. |

## Data Flow

```text
AuthController.login
  -> AuthMapper.toLoginInput
  -> LoginUseCase
      -> AuthUserRepository.findByEmailForLogin
      -> PasswordHasher.verify
      -> TokenService.signAccessToken/signRefreshToken
      -> PasswordHasher.hash(refreshToken)
      -> RefreshTokenRepository.save
  -> AuthMapper.toLoginResponseDto
  -> ResponseInterceptor { data: ... }
```

Nonexistent normalized email, missing `passwordHash`, or failed verification all exit through the same `INVALID_CREDENTIALS` business error.

## File Changes

| File | Action | Description |
|---|---|---|
| `src/auth/application/use-cases/login.use-case.ts` | Create | Login orchestration, generic credential failure helper, and safe result projection without `passwordHash`. |
| `src/auth/application/use-cases/login.use-case.spec.ts` | Create | Unit coverage for success, nonexistent email, no password hash, and bad password. |
| `src/auth/domain/ports/auth-user.repository.ts` | Modify | Add `AuthLoginUser` type and `findByEmailForLogin()` abstract method. |
| `src/auth/infrastructure/persistence/prisma-auth-user.repository.ts` | Modify | Implement login lookup selecting `id`, `name`, `email`, and nullable `passwordHash`; keep `findByEmail()` unchanged. |
| `src/auth/infrastructure/http/dto/login-request.dto.ts` | Create | DTO with trimmed/lowercased email and non-empty string password. |
| `src/auth/infrastructure/http/mappers/auth.mapper.ts` | Modify | Add `toLoginInput()` and `toLoginResponseDto()`; response excludes `passwordHash`. |
| `src/auth/infrastructure/http/auth.controller.ts` | Modify | Inject `LoginUseCase`; add `POST login` returning `200` with `RegisterResponseDto` schema. Use login DTO validation and reject extra fields at this boundary. |
| `src/auth/auth.module.ts` | Modify | Register `LoginUseCase`; existing port bindings remain valid. |
| `test/auth.e2e-spec.ts` | Modify | Add register-then-login success, invalid credentials `401`, and multiple refresh-token persistence assertions. |

## Interfaces / Contracts

```typescript
export type AuthLoginUser = AuthUser & { passwordHash: string | null };

export abstract class AuthUserRepository {
	abstract findByEmail(email: string): Promise<AuthUser | null>;
	abstract findByEmailForLogin(email: string): Promise<AuthLoginUser | null>;
	abstract createWithPassword(input: CreateUserWithPasswordInput): Promise<AuthUser>;
}
```

`LoginInput = { email: string; password: string }`. `LoginResult` mirrors `RegisterResult` and returns `user: AuthUser` only.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Login use-case success and generic failure branches | `Test.createTestingModule` with mocked ports beside the use case. |
| HTTP/DB E2E | `/api/v1/auth/login` contract, response envelope, invalid credentials, refresh-token rows | Extend `test/auth.e2e-spec.ts` using Testcontainers and `supertest`. |
| Regression | Registration still works and does not expose `passwordHash` | Keep existing registration E2E and unit assertions. |

Verification: run `npm test` and `npm run test:e2e`.

## Migration / Rollout

No migration required. Rollback by removing the login route, use case, DTO, mapper additions, repository login projection, provider registration, and login tests.

## Dependency Direction Check

Dependency direction remains `infrastructure -> application -> domain`. DTO and response mapping stay in `infrastructure/http`; Prisma mapping stays in `infrastructure/persistence`; `LoginUseCase` imports only domain ports and shared `BusinessException`.

## Open Questions

None.
