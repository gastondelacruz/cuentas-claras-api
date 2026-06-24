# Archive Report: auth-logout

**Change**: `auth-logout`  
**Archived**: 2026-06-24  
**Verdict**: PASS WITH WARNINGS → Archived with recorded deviations (no CRITICAL issues)  
**Issue**: https://github.com/gastondelacruz/cuentas-claras-api/issues/19  
**PR 1 (infra)**: https://github.com/gastondelacruz/cuentas-claras-api/pull/20  
**PR 2 (logout)**: https://github.com/gastondelacruz/cuentas-claras-api/pull/21

---

## Change Summary

Added a protected `POST /api/v1/auth/logout` endpoint that revokes a refresh token by deterministic HMAC-SHA256 digest lookup, returning `204 No Content` in all cases (idempotent, no info leakage). Introduced `tokenDigest` (`@unique`) column to `RefreshToken`, `TokenDigestService` port + HMAC adapter, `findByDigest` on `RefreshTokenRepository`, and digest persistence across login, register, and refresh rotation use cases.

Delivered as two chained PRs:
- **PR 1** (#20): Schema + migration + `TokenDigestService` + digest infra + creation delta (login/register/refresh).
- **PR 2** (#21): `LogoutUseCase` + `LogoutRequestDto` + controller route + DI wiring + unit/E2E tests.

---

## Final Artifact List

| Artifact | Location | Status |
|----------|----------|--------|
| Exploration | `openspec/changes/auth-logout/exploration.md` | ✅ |
| Proposal | `openspec/changes/auth-logout/proposal.md` | ✅ |
| Spec (auth-logout) | `openspec/changes/auth-logout/specs/auth-logout/spec.md` | ✅ |
| Spec delta (auth-login) | `openspec/changes/auth-logout/specs/auth-login/spec.md` | ✅ |
| Spec delta (auth-refresh-token-rotation) | `openspec/changes/auth-logout/specs/auth-refresh-token-rotation/spec.md` | ✅ |
| Design | `openspec/changes/auth-logout/design.md` | ✅ |
| Tasks | `openspec/changes/auth-logout/tasks.md` | ✅ (17/17 complete) |
| Verify report | `openspec/changes/auth-logout/verify-report.md` | ✅ PASS WITH WARNINGS |

---

## Specs Synced to Main

| Domain | Action | Details |
|--------|--------|---------|
| `auth-logout` | **Created** | New domain; delta copied to `openspec/specs/auth-logout/spec.md` |
| `auth-login` | **Updated** | "Token issuance" requirement: added `TokenDigestService.digest` clause + `tokenDigest` in scenario |
| `auth-refresh-token-rotation` | **Updated** | "Token verification" requirement: added digest persistence clause + "Successful rotation stores digest" scenario |

---

## Deviations Recorded

### W1 — Method name: `computeDigest` → `digest` (spec drift, corrected during archive)

- **Spec stated**: `TokenDigestService.computeDigest(rawToken)`
- **Implementation uses**: `TokenDigestService.digest(rawToken)` (port + all call sites)
- **Impact**: None — internal port, no external contract, no breaking change.
- **Resolution**: Spec updated in all three delta specs and the main auth-logout spec.

### S2 — `AuthMapper.toLogoutInput` not added (task deviation, reconciled during archive)

- **Task 5.2 stated**: add `AuthMapper.toLogoutInput(userId, dto)` static mapping method.
- **Implementation**: Controller inlines the mapping (`{ refreshToken: dto.refreshToken, userId: user.userId }`). No logic involved; simpler and architecturally sound for a no-response-body use case.
- **Impact**: None — functionally equivalent.
- **Resolution**: Task 5.2 in `tasks.md` updated to document the actual approach and mark as complete.

---

## Test Results at Archive

| Runner | Result |
|--------|--------|
| `npm test` | ✅ 163/163 unit tests, 42 files |
| `npm run test:e2e` | ✅ 87/87 E2E tests, 8 files |

Tasks complete: **17/17**

---

## Lessons Learned

1. **Spec method names need validation during design** — `computeDigest` was written in the spec before the port was created; the implementation team used `digest` (shorter, cleaner). A quick cross-check during apply would have caught this before verify.
2. **Thin controller mappings are preferable to mapper methods for no-body responses** — task 5.2 over-specified a mapper for logout, which has no response body and trivial input construction. The inline approach is simpler and does not violate hexagonal principles.
3. **Chained PRs (stacked-to-main) worked well for the infra/feature split** — ~500 lines delivered in two reviewable chunks without losing context.

---

## SDD Cycle Complete

All phases complete: explore → propose → spec → design → tasks → apply → verify → **archive**.

The `auth-logout` change is fully planned, implemented, verified, and archived.
