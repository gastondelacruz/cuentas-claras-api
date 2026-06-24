# Tasks: auth-refresh-token-rotation

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~280–340 (additions + deletions) |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr-default |
| Chain strategy | N/A |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | All 11 tasks below | PR 1 | Single PR; tests + impl + wiring included |

---

## Phase 1: Port Contract Extensions (Foundation)

- [x] 1.1 Add `RefreshToken` domain type to `src/auth/domain/ports/refresh-token.repository.ts`; add abstract methods `findActiveByUserId(userId: string): Promise<RefreshToken[]>`, `revoke(id: string): Promise<void>`, `revokeAllByUserId(userId: string): Promise<void>`.
- [x] 1.2 Add abstract method `verifyRefreshToken(token: string): Promise<{ sub: string }>` to `src/auth/domain/ports/token.service.ts`.

## Phase 2: Unit Tests — RED

- [x] 2.1 **[RED]** Create `src/auth/application/use-cases/refresh.use-case.spec.ts` with 4 failing scenarios: (a) rotation OK returns new pair, (b) JWT invalid/expired → 401, (c) no active tokens for user → 401, (d) reuse detected (JWT valid but no argon2 match) → `revokeAllByUserId` + 401.
- [x] 2.2 Run `npm test -- --reporter=verbose refresh.use-case` and confirm all 4 tests **fail** (red gate).

## Phase 3: Core Implementation

- [x] 3.1 Implement `verifyRefreshToken` in `src/auth/infrastructure/security/jwt-token.service.ts` — calls `jwtService.verifyAsync(token, { secret: jwtRefreshSecret })` and returns `{ sub }`.
- [x] 3.2 Implement `findActiveByUserId`, `revoke`, `revokeAllByUserId` in `src/auth/infrastructure/persistence/prisma-refresh-token.repository.ts` — wrap each in `runDatabaseOperation`; `findActiveByUserId` filters `revokedAt IS NULL AND expiresAt > now`; `revoke` sets `revokedAt = now`; `revokeAllByUserId` sets `revokedAt = now` for all matching rows.
- [x] 3.3 Create `src/auth/application/use-cases/refresh.use-case.ts` — orchestrates: `verifyRefreshToken` → `findActiveByUserId` → argon2 iterate via `passwordHasher.verify` → if no match `revokeAllByUserId` + throw `BusinessException(INVALID_REFRESH_TOKEN, 401)` → `revoke(matched.id)` → issue new access + refresh tokens → return `{ accessToken, refreshToken }`.

## Phase 4: HTTP Layer

- [x] 4.1 Create `src/auth/infrastructure/http/dto/refresh-request.dto.ts` — single `@IsString() @IsNotEmpty() refreshToken` field.
- [x] 4.2 Create `src/auth/infrastructure/http/dto/refresh-response.dto.ts` — `accessToken: string`, `refreshToken: string`.
- [x] 4.3 Add `toRefreshInput` and `toRefreshResponseDto` to `src/auth/infrastructure/http/mappers/auth.mapper.ts`.
- [x] 4.4 Add `POST /api/v1/auth/refresh` to `src/auth/infrastructure/http/auth.controller.ts` — `@Public @HttpCode(200)`, injects `RefreshUseCase`, calls mapper in/out.

## Phase 5: Module Wiring

- [x] 5.1 Register `RefreshUseCase` as a provider in `src/auth/auth.module.ts`.

## Phase 6: Unit Tests — GREEN

- [x] 6.1 Run `npm test -- --reporter=verbose refresh.use-case` and confirm all 4 scenarios pass (green gate).
- [x] 6.2 Run `npm test` (full suite) — zero regressions.

## Phase 7: E2E Tests + Final Verification

- [x] 7.1 Add `describe('POST /api/v1/auth/refresh')` block to `test/auth.e2e-spec.ts` covering: login→refresh returns new pair, old refresh token returns 401, tampered token returns 401, missing `refreshToken` field returns 400.
- [x] 7.2 Run `npm run test:e2e` — all E2E pass.
- [x] 7.3 Final: `npm test && npm run test:e2e` both green. Change is ready for apply.

---

**Total tasks**: 16 checklist items across 7 phases
**TDD contract**: RED (2.1–2.2) → Implementation (3.1–5.1) → GREEN (6.1–6.2) → E2E (7.1–7.3)
**No DB migration required** — `revoked_at` column already exists.
