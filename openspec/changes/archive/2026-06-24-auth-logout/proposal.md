# Proposal: Auth Logout

## Intent

Add protected logout so authenticated clients can revoke the submitted refresh token with deterministic lookup, receive `204 No Content`, and never learn whether the token existed, was already revoked, or belonged to another user.

## Scope

### In Scope
- Protected `POST /api/v1/auth/logout` in `src/auth` with `{ refreshToken }` DTO validation.
- Prisma migration adding non-null deterministic refresh-token digest storage with a unique index for direct lookup.
- Refresh-token creation stores both secure argon2 hash and deterministic digest.
- `LogoutUseCase` computes digest, loads by digest, validates authenticated-user ownership and active state silently, then sets `revokedAt = now` only for the submitted valid token.
- Refresh flow uses digest lookup where needed and still rejects invalid/revoked tokens.
- TDD: `logout.use-case.spec.ts` for revocation and idempotency; E2E proves logout invalidates `/auth/refresh`.

### Out of Scope
- Global logout / revoke all sessions.
- Legacy refresh tokens without digest: no fallback, backfill, or compatibility path.
- Access-token revocation or blacklist semantics.
- Revoking other active sessions for the same user.

## Capabilities

### New Capabilities
- `auth-logout`: Protected digest-based refresh-token revocation with idempotent `204` responses.

### Modified Capabilities
- `auth-login`: Refresh-token issuance persists argon2 hash plus deterministic digest.
- `auth-refresh-token-rotation`: Refresh lookup moves from iterative argon2 candidate checks to digest-based direct lookup as needed.

## Approach

Add `tokenDigest` to `RefreshToken` as non-null and globally unique to support `findUnique`/direct lookup; no legacy migration path is needed because the app is not in production. Token creation computes digest from the raw refresh token and stores it beside the argon2 hash. Logout remains protected by the global JWT guard, maps `LogoutRequestDto.refreshToken`, computes digest, loads the token by digest, verifies ownership and active state without exposing failures, revokes only that row, and returns `204`. Refresh reuses digest lookup so logout and refresh share the same invalidation path.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma`, `prisma/migrations/` | Modified | Add `tokenDigest` column and unique index. |
| `src/auth/infrastructure/http/` | Modified | Add protected route, DTO, mapper/API docs as needed. |
| `src/auth/application/use-cases/` | New | Add `LogoutUseCase` and unit spec. |
| `src/auth/domain/ports/` | Modified | Add digest lookup/revoke support if current ports are insufficient. |
| `src/auth/infrastructure/persistence/` | Modified | Persist digest, lookup by digest, revoke by id. |
| `test/auth.e2e-spec.ts` | Modified | Assert logout invalidates subsequent refresh. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Digest value becomes sensitive lookup material | Med | Keep argon2 verification storage; never expose digest; use strong deterministic digest. |
| Info leakage through response differences | Med | Always return `204` for valid access-token logout attempts. |
| Schema/refresh path mismatch | Med | Update creation, logout, refresh, unit, and E2E in one change. |

## Rollback Plan

Revert the logout route, DTO, use case, port/adapters, refresh/login digest writes, tests, and Prisma migration; migration rollback drops the digest column/index.

## Dependencies

- Existing JWT guard, refresh endpoint, argon2 hasher, Prisma migrations, and deterministic digest helper.

## Success Criteria

- [ ] `POST /api/v1/auth/logout` requires a valid access token and returns `204 No Content`.
- [ ] Refresh tokens are stored with argon2 hash and unique deterministic digest.
- [ ] Matching active refresh token for the authenticated user is revoked only for that token.
- [ ] Absent, already revoked, or other-user refresh tokens still return `204` without disclosure.
- [ ] After logout, the same refresh token fails against `/api/v1/auth/refresh`.
- [ ] `npm run test && npm run test:e2e` passes after implementation.
