# Tasks: Auth Logout

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~480–560 (8 new files + 9 modified) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → schema + digest infra + creation delta · PR 2 → logout route + use case + tests |
| Delivery strategy | auto-forecast |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Schema + TokenDigestService + login/register/refresh creation delta | PR 1 | Base: main; self-contained; no logout route yet |
| 2 | LogoutUseCase + controller route + DI + all tests + env doc | PR 2 | Base: PR 1 branch; depends on digest infra from PR 1 |

---

## Phase 1: Schema & Config (PR 1 foundation)

- [x] 1.1 **Prisma schema** — add `tokenDigest String @unique @map("token_digest")` to `RefreshToken` model in `prisma/schema.prisma`. AC: `npx prisma validate` passes.
- [x] 1.2 **Migration** — run `prisma migrate dev --name add_refresh_token_digest`; commit generated SQL file under `prisma/migrations/`. AC: migration file exists; column is NOT NULL UNIQUE in generated SQL.
- [x] 1.3 **Env config** — add `REFRESH_TOKEN_DIGEST_SECRET` (min-length 32, string) to `src/config/env.validation.ts` Joi schema and `src/config/auth.config.ts`. AC: app fails to start without the var; `authConfig().refreshTokenDigestSecret` is typed `string`.

## Phase 2: TokenDigest Port & Adapter (PR 1 infra)

- [x] 2.1 **Domain port** — create `src/auth/domain/ports/token-digest.service.ts` with abstract class `TokenDigestService { abstract digest(rawToken: string): string; }`. AC: no infra imports; pure TypeScript abstract class.
- [x] 2.2 **HMAC adapter** — create `src/auth/infrastructure/security/hmac-token-digest.service.ts` implementing `TokenDigestService` using `createHmac("sha256", secret).update(rawToken).digest("hex")`. AC: injectable; reads `REFRESH_TOKEN_DIGEST_SECRET` from `AuthConfig`.
- [x] 2.3 **HMAC adapter unit test** — create `src/auth/infrastructure/security/hmac-token-digest.service.spec.ts`. AC: same input + same secret → same output; different secret → different output.

## Phase 3: Repository Port & Adapter Delta (PR 1)

- [x] 3.1 **RefreshToken domain model** — add `tokenDigest: string` field to `RefreshToken` domain entity/interface in `src/auth/domain/`. AC: TypeScript compiles; no other files broken.
- [x] 3.2 **SaveRefreshTokenInput** — add `tokenDigest: string` to the input type/interface used by `refreshTokens.save(...)`. AC: all call sites type-check.
- [x] 3.3 **Repository port** — add `findByDigest(digest: string): Promise<RefreshToken | null>` to `src/auth/domain/ports/refresh-token.repository.ts`. AC: abstract method declared; adapter will be required to implement it.
- [x] 3.4 **Prisma adapter** — implement `findByDigest` in `src/auth/infrastructure/persistence/prisma-refresh-token.repository.ts` using `prisma.refreshToken.findUnique({ where: { tokenDigest: digest } })` + domain mapping. AC: TypeScript compiles; returns `null` for unknown digest.
- [x] 3.5 **Adapter save delta** — update `save()` in Prisma adapter to persist `tokenDigest` column. AC: `create` call includes `token_digest`.

## Phase 4: Creation Delta — Login / Register / Refresh (PR 1)

- [x] 4.1 **LoginUseCase** — inject `TokenDigestService`; after `signRefreshToken`, compute `digest = tokenDigest.digest(rawToken)`; pass `tokenDigest: digest` into `refreshTokens.save(...)` in `src/auth/application/use-cases/login.use-case.ts`. AC: unit test for login still passes with updated mock.
- [x] 4.2 **RegisterUseCase** — same creation delta as 4.1 in `src/auth/application/use-cases/register.use-case.ts`. AC: unit test passes.
- [x] 4.3 **RefreshTokenUseCase** — inject `TokenDigestService`; compute and persist digest for newly rotated token in `src/auth/application/use-cases/refresh-token.use-case.ts`. AC: unit test passes; digest stored on rotation.

## Phase 5: Logout Route & Use Case (PR 2)

- [x] 5.1 **LogoutRequestDto** — create `src/auth/infrastructure/http/dto/logout-request.dto.ts` with `@IsString() @IsNotEmpty() @ApiProperty() refreshToken: string`. AC: class-validator rejects empty/missing field with 400.
- [x] 5.2 **AuthMapper** — `toLogoutInput` was not added. Controller inlines the mapping directly (`{ refreshToken: dto.refreshToken, userId: user.userId }`). Functionally equivalent and simpler; no mapper method needed for a no-response-body use case. _(Archive deviation: S2 from verify-report)_
- [x] 5.3 **LogoutUseCase** — create `src/auth/application/use-cases/logout.use-case.ts`. Algorithm: digest raw token → `findByDigest` → null → return; userId mismatch → return; revokedAt not null → return; expiresAt ≤ now → return; else `revoke(row.id)`. Never throw `BusinessException`. AC: compiles; all branches covered.
- [x] 5.4 **AuthController route** — add `@Post("logout") @HttpCode(HttpStatus.NO_CONTENT) @ApiNoContentResponse()` to `src/auth/infrastructure/http/auth.controller.ts`; args `@CurrentUser("userId") userId`, `@Body() body: LogoutRequestDto`; calls `LogoutUseCase.execute(mapper.toLogoutInput(userId, body))`. AC: no `@Public`; controller compiles.

## Phase 6: DI Wiring (PR 2)

- [x] 6.1 **AuthModule** — in `src/auth/auth.module.ts`: add `HmacTokenDigestService` to providers; bind `{ provide: TokenDigestService, useExisting: HmacTokenDigestService }`; add `LogoutUseCase` to providers. AC: `npm run build` succeeds; no circular deps.

## Phase 7: Tests (PR 2)

- [x] 7.1 **LogoutUseCase unit tests** — create `src/auth/application/use-cases/logout.use-case.spec.ts`. Scenarios: revokes matching active owned token; no-op already-revoked; no-op digest matches no row; no-op wrong userId; no-op expired token; never throws `BusinessException`. AC: all branches covered; `npm test` passes.
- [x] 7.2 **E2E logout test** — add `describe("Auth logout endpoint (e2e)")` to `test/auth.e2e-spec.ts`. Scenarios: register→login→logout 204→refresh same token 401; logout without bearer → 401; unknown/other-user token → 204; missing `refreshToken` field → 400. Set `process.env.REFRESH_TOKEN_DIGEST_SECRET` in `beforeAll`. AC: `npm run test:e2e` passes.

## Phase 8: Env Doc (PR 2)

- [x] 8.1 **Env var documentation** — document `REFRESH_TOKEN_DIGEST_SECRET` (purpose, min-length 32, rotation independence from `JWT_REFRESH_SECRET`) in `.env.example` and any existing env reference file. AC: entry present in `.env.example`.
