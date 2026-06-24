# Design: Auth Logout

## Technical Approach

Add a protected `POST /api/v1/auth/logout` that deterministically locates the submitted refresh token by an HMAC-SHA256 digest and revokes only that row, always returning `204` with no information leakage. A new `tokenDigest` column (unique) enables O(1) `findByDigest` lookup while argon2 `tokenHash` stays for verification (defense in depth). Digest is produced by a new domain port `TokenDigestService` (abstract class) implemented by `HmacTokenDigestService`, mirroring the existing `PasswordHasher`/`Argon2PasswordHasher` and `TokenService`/`JwtTokenService` port-adapter pattern. All three creation paths (register, login, refresh-rotation) compute and persist the digest.

## Architecture Decisions

| Decision | Choice | Alternatives rejected | Rationale |
|---|---|---|---|
| Digest location | Domain port `TokenDigestService`, infra adapter `HmacTokenDigestService` | Compute inside Prisma adapter; static crypto util in use case | Adapter `save()` receives an already-argon2-hashed value, never the raw token, so digest must be computed where the raw token lives (use cases). Port keeps use cases pure and DI-testable. |
| Secret | New env `REFRESH_TOKEN_DIGEST_SECRET` (min 32) | Derive from `JWT_REFRESH_SECRET` | Independent rotation, separation of concerns; deriving couples logout lookups to JWT signing key. |
| Digest algorithm | `createHmac("sha256", secret).update(rawToken).digest("hex")` | Plain SHA-256 | Keyed HMAC prevents offline digest precomputation if the column leaks. |
| Logout lookup | `findByDigest` direct unique lookup | Iterate `findActiveByUserId` + argon2 | Deterministic O(1); the whole point of the migration. |
| Refresh path | Keep iterative `findActiveByUserId` + argon2 (unchanged) but now also write digest on rotation | Switch refresh to `findByDigest` | Minimizes change surface / review budget; reuse-detection semantics in `RefreshTokenUseCase` stay intact. Digest convergence is a follow-up. |
| Route protection | Rely on global `APP_GUARD` (`JwtAuthGuard`); omit `@Public()` | Per-route `@UseGuards(JwtAuthGuard)` | Matches existing protected routes (e.g. `me/summary`). Explicit `@UseGuards` is redundant but acceptable. |

## Data Flow

```text
Controller(@CurrentUser userId, LogoutRequestDto)
   -> AuthMapper.toLogoutInput -> LogoutUseCase.execute({ userId, refreshToken })
        -> TokenDigestService.digest(rawToken)
        -> RefreshTokenRepository.findByDigest(digest)
        -> if owned + active: RefreshTokenRepository.revoke(id)
   -> always 204 (no body)
```

## File Changes

| File | Action | Description |
|---|---|---|
| `prisma/schema.prisma` | Modify | Add `tokenDigest String @unique @map("token_digest")` to `RefreshToken`. |
| `prisma/migrations/<ts>_add_refresh_token_digest/` | Create | `add_refresh_token_digest` migration (column + unique index). |
| `src/config/auth.config.ts` | Modify | Add `refreshTokenDigestSecret: process.env.REFRESH_TOKEN_DIGEST_SECRET!`. |
| `src/config/env.validation.ts` | Modify | Add `REFRESH_TOKEN_DIGEST_SECRET` Joi rule (test default, else `min(32).required()`). |
| `src/auth/domain/ports/token-digest.service.ts` | Create | Abstract `TokenDigestService { digest(rawToken): string }`. |
| `src/auth/domain/ports/refresh-token.repository.ts` | Modify | Add `tokenDigest` to types; add `findByDigest`. |
| `src/auth/infrastructure/security/hmac-token-digest.service.ts` (+`.spec.ts`) | Create | HMAC-SHA256 adapter using `authConfig`. |
| `src/auth/infrastructure/persistence/prisma-refresh-token.repository.ts` | Modify | Persist `tokenDigest`; implement `findByDigest`. |
| `src/auth/application/use-cases/logout.use-case.ts` (+`.spec.ts`) | Create | Idempotent revocation use case. |
| `src/auth/application/use-cases/{login,register,refresh}.use-case.ts` | Modify | Inject `TokenDigestService`, compute + pass `tokenDigest` to `save`. |
| `src/auth/infrastructure/http/dto/logout-request.dto.ts` | Create | `LogoutRequestDto`. |
| `src/auth/infrastructure/http/auth.controller.ts` | Modify | Add protected `logout` handler. |
| `src/auth/infrastructure/http/mappers/auth.mapper.ts` | Modify | Add `toLogoutInput`. |
| `src/auth/auth.module.ts` | Modify | Provide adapter, bind port, register `LogoutUseCase`. |
| `test/auth.e2e-spec.ts` | Modify | Add logout → refresh invalidation suite; set new env secret. |

## Interfaces / Contracts

```typescript
// domain/ports/token-digest.service.ts
export abstract class TokenDigestService {
	abstract digest(rawToken: string): string;
}

// domain/ports/refresh-token.repository.ts (delta)
export type SaveRefreshTokenInput = {
	userId: string;
	tokenHash: string;
	tokenDigest: string;   // new
	expiresAt: Date;
};
export type RefreshToken = { /* ...existing... */ tokenDigest: string };
abstract findByDigest(digest: string): Promise<RefreshToken | null>;

// application/use-cases/logout.use-case.ts
export type LogoutInput = { userId: string; refreshToken: string };
// execute: digest -> findByDigest -> guard(owned && revokedAt===null && expiresAt>now) -> revoke(id); return void
```

`LogoutRequestDto`: `@ApiProperty()` + `@IsString()` + `@IsNotEmpty()` on `refreshToken!` (mirrors `RefreshRequestDto`).

Controller handler:

```typescript
@Post("logout")
@HttpCode(HttpStatus.NO_CONTENT)
@ApiNoContentResponse()
async logout(
	@CurrentUser("userId") userId: string,
	@Body() body: LogoutRequestDto,
): Promise<void> {
	await this.logoutUseCase.execute(AuthMapper.toLogoutInput(userId, body));
}
```

### LogoutUseCase algorithm (no leakage)

1. `const digest = this.tokenDigest.digest(input.refreshToken)`.
2. `const row = await this.refreshTokens.findByDigest(digest)`.
3. If `row === null` → return (no-op).
4. If `row.userId !== input.userId` → return (no-op; never reveal ownership).
5. If `row.revokedAt !== null` → return (idempotent).
6. If `row.expiresAt <= new Date()` → return (already inert).
7. Else `await this.refreshTokens.revoke(row.id)`.
8. Always resolve `void`. Never throw `BusinessException` for token state; only `DatabaseException` may bubble from the adapter.

### Creation delta (where digest is written)

In `register`, `login`, and `refresh` rotation: after `const refresh = await this.tokens.signRefreshToken(...)`, add `const tokenDigest = this.tokenDigest.digest(refresh.token)` and pass `tokenDigest` into `refreshTokens.save({...})`. Each use case gains a `TokenDigestService` constructor dependency.

### DI wiring (`auth.module.ts`)

Add providers: `HmacTokenDigestService`, `LogoutUseCase`, and binding `{ provide: TokenDigestService, useExisting: HmacTokenDigestService }`. Controller adds `LogoutUseCase` injection.

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit | `logout.use-case.spec.ts` | Mock `TokenDigestService` + `RefreshTokenRepository`. |
| Unit | `hmac-token-digest.service.spec.ts` | Deterministic + secret-sensitive digest. |
| E2E | logout invalidates refresh | Testcontainers + supertest. |

`logout.use-case.spec.ts` (`describe("LogoutUseCase")`):
- `it("revokes the matching active token owned by the user")`
- `it("is idempotent: no-op when token is already revoked")`
- `it("no-op when digest matches no row")`
- `it("no-op when the token belongs to another user")`
- `it("no-op when the matched token is expired")`
- `it("never throws a BusinessException for any token state")`

E2E (`describe("Auth logout endpoint (e2e)")`): register → login → `POST /auth/logout` with access token + refreshToken → expect `204`; then `POST /auth/refresh` with same token → expect `401`. Add: logout without bearer → `401`; logout with unknown/other-user token → still `204`; missing `refreshToken` → `400`. Set `process.env.REFRESH_TOKEN_DIGEST_SECRET` in every e2e `beforeAll`.

## Migration / Rollout

Not production yet, so no backfill. `npx prisma migrate dev --name add_refresh_token_digest`. The column is `NOT NULL @unique`; existing rows are wiped by test `deleteMany`, and dev DB has no protected data. Rollback drops column + unique index. E2E uses `prisma db push`, so the column applies automatically.

## Open Questions

- [ ] Confirm `REFRESH_TOKEN_DIGEST_SECRET` as a distinct env var (recommended) vs. reusing an existing secret.
- [ ] Accept deferring refresh-path convergence to digest lookup as a follow-up (recommended to protect review budget).
