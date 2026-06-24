# Proposal: Auth Refresh Token Rotation

## Intent

The API currently issues refresh tokens on login but provides no endpoint to exchange them for a new pair. Clients cannot maintain sessions beyond the access token TTL without re-authenticating. This change adds `POST /api/v1/auth/refresh` with secure rotation (old token revoked, new pair issued) and reuse-detection (revoke all sessions on suspicious double-use).

## Scope

### In Scope
- `POST /api/v1/auth/refresh` public endpoint returning a new `{ accessToken, refreshToken }` pair
- `RefreshUseCase` with rotation and reuse-detection logic
- Port extensions: `TokenService.verifyRefreshToken`, `RefreshTokenRepository.findActiveByUserId / revoke / revokeAllByUserId`
- Adapter implementations in `JwtTokenService` and `PrismaRefreshTokenRepository`
- `RefreshRequestDto`, mapper methods (`toRefreshInput`, `toRefreshResponseDto`)
- Unit tests (`refresh.use-case.spec.ts`) and E2E tests (`auth.e2e-spec.ts`)

### Out of Scope
- Max-active-sessions cap / expired token pruning on login (future hardening)
- DB-level optimistic locking for concurrent refresh race (low priority)
- Making reuse-detection configurable (always-on for now — see Risks)
- Refresh token rotation on `logout` endpoint (separate change)

## Critical Design Decision: argon2 Hash Lookup

The feature request mentions `findActiveByHash`, but **argon2 is non-deterministic** — the same raw token produces a different hash every call, making direct DB lookup impossible.

**Chosen approach — per-user iteration (Approach A):**
1. `verifyRefreshToken(rawToken)` → JWT decode → `{ sub: userId }`
2. `findActiveByUserId(userId)` → all non-revoked, non-expired rows
3. Iterate: `passwordHasher.verify(rawToken, candidate.tokenHash)` → find match
4. No match → reuse detected → `revokeAllByUserId(userId)` → throw `INVALID_REFRESH_TOKEN` (401)
5. Match found → `revoke(match.id)` + sign+hash+save new pair → return new pair

**Why not Approach B (dual-hash / SHA-256 lookup column)?** Requires schema migration and added complexity; O(n) argon2 calls are acceptable at current user session scale (1–5 active sessions per user).

## Capabilities

### New Capabilities
- `auth-refresh-token-rotation`: Refresh token rotation endpoint — validates, rotates, and detects reuse of refresh tokens

### Modified Capabilities
- `auth-login`: Port contracts (`RefreshTokenRepository`, `TokenService`) extend — no behavioral change to login flow itself, but abstract classes gain new methods

## Approach

Add all artifacts as **additive changes** — no breaking modifications to existing ports, use cases, or DB schema:
1. Extend port contracts (`domain/ports/`)
2. Implement `RefreshUseCase` TDD-first (red → green → refactor)
3. Implement persistence adapter methods (`PrismaRefreshTokenRepository`)
4. Implement `verifyRefreshToken` in `JwtTokenService`
5. Wire HTTP layer (controller + DTO + mapper + module binding)
6. E2E test: register → login → refresh → assert old token rejected

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/auth/domain/ports/refresh-token.repository.ts` | Modified | Add `findActiveByUserId`, `revoke`, `revokeAllByUserId` |
| `src/auth/domain/ports/token.service.ts` | Modified | Add `verifyRefreshToken(token): Promise<RefreshTokenPayload>` |
| `src/auth/application/use-cases/refresh.use-case.ts` | New | `RefreshUseCase` with rotation + reuse detection |
| `src/auth/application/use-cases/refresh.use-case.spec.ts` | New | Unit: rotation OK, revoked token, non-existent, expired, reuse |
| `src/auth/infrastructure/persistence/prisma-refresh-token.repository.ts` | Modified | Implement 3 new port methods |
| `src/auth/infrastructure/security/jwt-token.service.ts` | Modified | Implement `verifyRefreshToken` |
| `src/auth/infrastructure/http/auth.controller.ts` | Modified | Add `POST /refresh` route |
| `src/auth/infrastructure/http/dto/refresh-request.dto.ts` | New | `{ refreshToken: string }` DTO |
| `src/auth/infrastructure/http/mappers/auth.mapper.ts` | Modified | Add `toRefreshInput`, `toRefreshResponseDto` |
| `src/auth/auth.module.ts` | Modified | Register `RefreshUseCase` |
| `test/auth.e2e-spec.ts` | Modified | Add rotation E2E scenarios |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Reuse detection logs out all sessions (strong stance may surprise users) | Med | Document behavior; keep always-on for now, make configurable in follow-up |
| Concurrent refresh race (two calls with same token pass active check simultaneously) | Low | Accept for now; add DB-level unique constraint or advisory lock in hardening follow-up |
| argon2 iteration latency if user has many active sessions | Low | Sessions per user expected 1–5; add max-sessions cap in follow-up if metrics show p99 > 200ms |
| `verifyRefreshToken` has no test coverage today | High | Must include `jwt-token.service.spec.ts` extension in this change |

## Rollback Plan

All changes are **additive**. Rollback: revert the branch. No DB migration means no destructive schema rollback. Active refresh tokens in DB are unaffected (existing `revokedAt`-nullable rows remain valid).

## Dependencies

- No new libraries — `argon2`, `jsonwebtoken`, Prisma already present
- No Prisma schema migration — `revokedAt` column exists

## Success Criteria

- [ ] `POST /api/v1/auth/refresh` with a valid token returns `{ data: { accessToken, refreshToken } }`
- [ ] Using the old refresh token after rotation returns 401 `INVALID_REFRESH_TOKEN`
- [ ] Using a revoked or expired token returns 401 `INVALID_REFRESH_TOKEN`
- [ ] Presenting an already-revoked token triggers `revokeAllByUserId` (reuse detection)
- [ ] `npm test` passes (unit: rotation OK, revoked, non-existent, expired, reuse)
- [ ] `npm run test:e2e` passes (full request → DB → response wiring)
