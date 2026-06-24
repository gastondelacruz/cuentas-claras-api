# Exploration: auth-refresh-token-rotation

## Current State

The auth domain follows a clean hexagonal structure:
- `domain/ports/` — 4 abstract classes: `AuthUserRepository`, `PasswordHasher`, `RefreshTokenRepository`, `TokenService`
- `application/use-cases/` — `LoginUseCase`, `RegisterUseCase` (both with `.spec.ts`)
- `infrastructure/http/` — `AuthController`, DTOs (`login-request`, `register-request`, `register-response`), `AuthMapper`
- `infrastructure/persistence/` — `PrismaAuthUserRepository`, `PrismaRefreshTokenRepository`
- `infrastructure/security/` — `JwtTokenService`, `JwtStrategy`, `JwtAuthGuard`, `Argon2PasswordHasher`
- `auth.module.ts` — binds all ports to adapters via `useExisting`

**Refresh token persistence pattern (established by Login/Register):**
1. `signRefreshToken()` → `{ token, expiresAt }`
2. `passwordHasher.hash(token)` → argon2 hash (non-deterministic)
3. `refreshTokens.save({ userId, tokenHash, expiresAt })`
4. Return raw `token` to client

**Prisma schema** (`refresh_tokens` table) already has:
- `id`, `userId`, `tokenHash`, `expiresAt`, `revokedAt` (nullable), `createdAt`, `updatedAt`
- Indexes on `userId` and `expiresAt`
- `revokedAt` is already there — NO migration needed for soft revocation

## Affected Areas

- `src/auth/domain/ports/refresh-token.repository.ts` — must add `findActiveByUserId`, `revoke`, `revokeAllByUserId`
- `src/auth/domain/ports/token.service.ts` — must add `verifyRefreshToken(token): Promise<RefreshTokenPayload>`
- `src/auth/application/use-cases/` — new file `refresh.use-case.ts` + `refresh.use-case.spec.ts`
- `src/auth/infrastructure/persistence/prisma-refresh-token.repository.ts` — implement new port methods
- `src/auth/infrastructure/security/jwt-token.service.ts` — implement `verifyRefreshToken`
- `src/auth/infrastructure/http/auth.controller.ts` — add `POST /api/v1/auth/refresh` endpoint
- `src/auth/infrastructure/http/dto/` — new `refresh-request.dto.ts`
- `src/auth/infrastructure/http/mappers/auth.mapper.ts` — add `toRefreshInput` and `toRefreshResponseDto`
- `src/auth/auth.module.ts` — register `RefreshUseCase`
- `test/auth.e2e-spec.ts` — add refresh rotation E2E tests

## Critical Design Decision: Hash Lookup Problem

**The argon2 hash is non-deterministic** — storing argon2(token) means we CANNOT do a direct DB lookup by `tokenHash`. Two viable approaches:

### Approach A — Per-user active token iteration (recommended)
- After `verifyRefreshToken` succeeds, get `userId` from JWT payload (`sub`)
- Add `findActiveByUserId(userId)` to port → returns all non-revoked, non-expired tokens
- In use case: iterate and call `passwordHasher.verify(rawToken, candidate.tokenHash)` for each
- **Pros**: No schema change, consistent with existing argon2 pattern, simple
- **Cons**: O(n) argon2 verify calls per user (acceptable: users have 1–5 active sessions)

### Approach B — Dual hash (deterministic lookup + argon2 verification)
- Add a `lookupHash` column (SHA-256 of token) for fast DB lookup
- Store both `lookupHash` and `tokenHash` (argon2)
- **Pros**: O(1) DB lookup
- **Cons**: Schema migration, added complexity, overkill for current scale

**Recommendation: Approach A** — aligns with existing pattern, no migration, sufficient for scale.

## Approaches for `RefreshTokenRepository` extensions

The port needs:
```ts
abstract findActiveByUserId(userId: string): Promise<ActiveRefreshToken[]>
abstract revoke(id: string): Promise<void>
abstract revokeAllByUserId(userId: string): Promise<void>  // for reuse detection
```

Where `ActiveRefreshToken = { id: string; tokenHash: string; expiresAt: Date }`.

## RefreshUseCase flow

```
1. TokenService.verifyRefreshToken(rawToken) → { sub: userId } or throw INVALID_REFRESH_TOKEN
2. RefreshTokenRepository.findActiveByUserId(userId) → candidates[]
3. Iterate candidates: passwordHasher.verify(rawToken, candidate.tokenHash) → match or not
4. If no match found → reuse detection → revokeAllByUserId(userId) → throw INVALID_REFRESH_TOKEN
5. If match found but expired → revoke(id) → throw INVALID_REFRESH_TOKEN  [schema already handles this via expiresAt]
6. ROTATE: revoke(match.id) + signRefreshToken + hash + save new pair
7. Return { accessToken, refreshToken }
```

Note: "expired" check is done in memory after fetching (`candidate.expiresAt < now()`), or the `findActiveByUserId` query filters by `expiresAt > now()` directly.

## BusinessException error codes to introduce

| Code | HTTP | When |
|------|------|------|
| `INVALID_REFRESH_TOKEN` | 401 | JWT invalid, token not found, revoked, or expired |

## E2E test structure (established pattern)

- Each `describe` block spins up its own `PostgreSqlContainer` (via Testcontainers)
- `execSync("npx prisma db push")` to apply schema
- `beforeEach` truncates `refreshToken` + `user` tables
- `supertest` hits real HTTP endpoints
- For refresh tests: register → login → use `refreshToken` → assert new pair returned + old one rejected

## Gaps (what's missing)

1. ❌ `TokenService.verifyRefreshToken()` — not in port or implementation
2. ❌ `RefreshTokenRepository.findActiveByUserId()` — only `save()` exists
3. ❌ `RefreshTokenRepository.revoke()` — missing
4. ❌ `RefreshTokenRepository.revokeAllByUserId()` — missing (for reuse detection)
5. ❌ `RefreshUseCase` — does not exist
6. ❌ `POST /api/v1/auth/refresh` endpoint — controller not wired
7. ❌ `RefreshRequestDto` — no DTO for the new endpoint
8. ❌ Mapper methods for refresh input/output

## What does NOT need to change

- ✅ Prisma schema — `revokedAt` already present, no migration needed
- ✅ `auth.module.ts` structure — just needs `RefreshUseCase` added
- ✅ `BusinessException` shape — reuse as-is
- ✅ `PasswordHasher` — `verify()` already exists, used in login

## Recommendation

**Approach A** for hash lookup. All gaps are additive (no breaking changes to existing code). Start with:
1. Extend port contracts (both `RefreshTokenRepository` and `TokenService`)
2. Implement `RefreshUseCase` (TDD: unit spec first)
3. Implement persistence adapter methods
4. Implement `verifyRefreshToken` in `JwtTokenService`
5. Wire HTTP layer (controller + DTO + mapper)
6. E2E test

## Risks

- **Reuse detection scope**: revoking ALL user tokens on reuse detection is a strong security stance but logs everyone out. The feature request says "optionally" — confirm with product whether it's always on or configurable.
- **Concurrent refresh race**: two simultaneous refreshes with the same token could both pass the active check before either is revoked. Mitigate with a DB-level unique constraint or optimistic concurrency (low priority for now).
- **argon2 iteration cost**: if a user has many active sessions, verifying each hash could add latency. Consider adding a max-active-sessions limit or pruning expired tokens on login.
- **No `verifyRefreshToken` test coverage today**: `jwt-token.service.spec.ts` only tests sign methods — must extend it.

## Ready for Proposal

Yes — codebase is well-structured, all gaps are clearly bounded and additive. Ready to move to `sdd-propose`.
