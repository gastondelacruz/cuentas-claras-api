# Design: Auth Refresh Token Rotation

## Technical Approach

Add `POST /api/v1/auth/refresh` following the existing auth hexagon. A new `RefreshUseCase` orchestrates: verify JWT via `TokenService.verifyRefreshToken` → load active tokens via `RefreshTokenRepository.findActiveByUserId` → argon2-iterate with `PasswordHasher.verify` → on match, revoke old + persist new pair; on no-match (reuse), `revokeAllByUserId` + throw. All port changes are additive. No DB migration (`revokedAt` already exists).

## Architecture Decisions

| Decision | Choice | Alternative rejected | Rationale |
|---|---|---|---|
| Token lookup | `verifyRefreshToken` → `findActiveByUserId` → argon2 iterate | `findActiveByHash` | argon2 is non-deterministic; the stored hash can't be derived from the raw token, so direct lookup is impossible |
| Reuse response | `revokeAllByUserId` + 401 | Revoke only presented token | Strong stance: a replayed rotated token signals theft; nuke the family |
| Refresh response body | `{ accessToken, refreshToken }` only | Include `user` like login | Use case never loads the user; avoids an extra DB read and keeps the contract minimal |
| Domain entity | New `RefreshToken` type in the repo port | Reuse Prisma model | Domain layer must not import Prisma types |
| Error | `BusinessException("INVALID_REFRESH_TOKEN", ..., 401)` | Nest `UnauthorizedException` | Use cases throw `BusinessException`; filter normalizes |

## Data Flow

    Controller ─toRefreshInput─> RefreshUseCase
        │                            │ 1. tokens.verifyRefreshToken(raw) -> { sub }
        │                            │ 2. refreshTokens.findActiveByUserId(sub)
        │                            │ 3. iterate passwordHasher.verify(raw, row.tokenHash)
        │                            │ 4a. match  -> revoke(old.id) + sign new + save new
        │                            │ 4b. none   -> revokeAllByUserId(sub) -> throw 401
        v                            v
    RefreshResponseDto <─toRefreshResponseDto─ RefreshResult

## File Changes

| File | Action | Description |
|---|---|---|
| `src/auth/domain/ports/refresh-token.repository.ts` | Modify | Add `RefreshToken` type + `findActiveByUserId`, `revoke`, `revokeAllByUserId` |
| `src/auth/domain/ports/token.service.ts` | Modify | Add `verifyRefreshToken(token): Promise<RefreshTokenPayload>` |
| `src/auth/infrastructure/security/jwt-token.service.ts` | Modify | Implement `verifyRefreshToken` using `jwtRefreshSecret` |
| `src/auth/infrastructure/persistence/prisma-refresh-token.repository.ts` | Modify | Implement 3 new methods |
| `src/auth/application/use-cases/refresh.use-case.ts` | Create | Rotation + reuse-detection orchestration |
| `src/auth/application/use-cases/refresh.use-case.spec.ts` | Create | Unit tests |
| `src/auth/infrastructure/http/dto/refresh-request.dto.ts` | Create | `{ refreshToken }` validation |
| `src/auth/infrastructure/http/dto/refresh-response.dto.ts` | Create | `{ accessToken, refreshToken }` |
| `src/auth/infrastructure/http/mappers/auth.mapper.ts` | Modify | Add `toRefreshInput` + `toRefreshResponseDto` |
| `src/auth/infrastructure/http/auth.controller.ts` | Modify | Add `POST refresh` (`@Public`, `@HttpCode(200)`) |
| `src/auth/auth.module.ts` | Modify | Register `RefreshUseCase` |
| `test/auth.e2e-spec.ts` | Modify | Add refresh E2E describe block |

## Interfaces / Contracts

```typescript
// refresh-token.repository.ts (additions)
export type RefreshToken = {
	id: string;
	userId: string;
	tokenHash: string;
	expiresAt: Date;
	revokedAt: Date | null;
};
abstract findActiveByUserId(userId: string): Promise<RefreshToken[]>;
abstract revoke(id: string): Promise<void>;
abstract revokeAllByUserId(userId: string): Promise<void>;

// token.service.ts (addition)
abstract verifyRefreshToken(token: string): Promise<RefreshTokenPayload>;

// refresh.use-case.ts
export type RefreshInput = { refreshToken: string };
export type RefreshResult = { accessToken: string; refreshToken: string };
```

`findActiveByUserId` returns rows where `revokedAt IS NULL` AND `expiresAt > now()`. `revoke` sets `revokedAt = new Date()`. Both wrap Prisma in `DatabaseException` per the existing `runDatabaseOperation` helper. `verifyRefreshToken` calls `jwtService.verifyAsync(token, { secret: jwtRefreshSecret })`; any throw is caught by the use case and converted to `INVALID_REFRESH_TOKEN`.

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit | `RefreshUseCase` | `Test.createTestingModule` with mocked `TokenService`, `RefreshTokenRepository`, `PasswordHasher`. Cases: rotation OK, JWT invalid/expired (verify throws), empty active list, reuse (no argon2 match → `revokeAllByUserId` called). Assert `revoke(old)` + `save(new)` on success. |
| E2E | endpoint | Reuse existing Testcontainers bootstrap in `test/auth.e2e-spec.ts`. Cases: login→refresh returns new pair + new access token works; old token rejected 401 after rotation; tampered token 401; missing field 400. |

## Migration / Rollout

No migration required — `refresh_tokens.revoked_at` already exists. Purely additive.

## Open Questions

- None blocking. Concurrent-refresh race (two simultaneous valid refreshes) is out of scope per proposal (low priority).
