## Exploration: auth-logout

### Current State
`src/auth/` is already a hexagonal NestJS module with `AuthController`, `JwtAuthGuard` registered globally through `APP_GUARD`, and public routes marked with `@Public()`. The refresh-token flow already persists hashed refresh tokens in Prisma, validates them through `TokenService.verifyRefreshToken()`, and rotates them in `RefreshTokenUseCase`.

The important constraint is that refresh tokens are stored as argon2 hashes, so the current persistence model does **not** support a direct raw-token lookup by hash unless a deterministic lookup field is added.

### Affected Areas
- `src/auth/infrastructure/http/auth.controller.ts` — add protected `POST /api/v1/auth/logout` and wire a new use case.
- `src/auth/infrastructure/http/dto/` — add `LogoutRequestDto` with `refreshToken`.
- `src/auth/application/use-cases/` — add `logout.use-case.ts` and `logout.use-case.spec.ts`.
- `src/auth/domain/ports/refresh-token.repository.ts` — add a port method for locating a token candidate and revoking it.
- `src/auth/infrastructure/persistence/prisma-refresh-token.repository.ts` — implement the new lookup/revoke behavior.
- `src/auth/infrastructure/security/jwt-auth.guard.ts` / `src/app.module.ts` — confirm the endpoint remains protected by the global guard.
- `src/auth/infrastructure/http/mappers/auth.mapper.ts` — add logout input mapping if the controller follows the existing mapper convention.
- `test/auth.e2e-spec.ts` — add logout → refresh invalidation coverage.
- `openspec/changes/auth-logout/` — proposal/spec/design/tasks artifacts still need to be created.

### Approaches
1. **Iterate active refresh tokens by user** — verify the JWT to get `sub`, fetch active refresh-token rows for that user, compare each stored hash, then revoke the matched row and return OK even when nothing matches.
   - Pros: no schema migration, fits existing argon2 storage pattern, can be reused for refresh and logout.
   - Cons: not a true direct lookup by raw hash; O(n) argon2 checks per user.
   - Effort: Medium

2. **Add deterministic lookup material** — store a second deterministic token digest (for example SHA-256) to support direct DB lookup by token, while keeping argon2 for verification.
   - Pros: true lookup-by-hash behavior, faster logout/refresh candidate resolution.
   - Cons: schema migration, extra storage and implementation complexity, wider change surface.
   - Effort: High

### Recommendation
Prefer **Approach 1** for the initial change unless the product explicitly requires O(1) token lookup. It is the smallest safe path and preserves the current security model. The logout use case should be idempotent: if the token is missing, already revoked, or belongs to no active row, return success without revealing which case happened.

### Risks
- The requirement says “look it up by hash,” but the current argon2 storage makes a raw DB hash lookup impossible without a second deterministic digest.
- Logout idempotency can accidentally leak account/session state if the response differs between “not found,” “already revoked,” and “revoked now.”
- E2E coverage must prove the old refresh token fails after logout, so the logout flow needs to affect the same persistence path used by refresh.

### Ready for Proposal
Yes — the scope is clear enough for proposal/spec: add a protected logout route, a logout use case, a repo lookup/revoke extension, one unit spec, and one E2E regression asserting refresh token invalidation after logout.
