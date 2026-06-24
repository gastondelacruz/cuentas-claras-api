# Apply Progress: auth-refresh-token-rotation

## Remediation Summary

**What**: Remediated the gatekeeper failure by restoring refresh-token signing to a sub-only contract and keeping `jti` as an internal uniqueness claim.

**Why**: Fresh-context review found the previous implementation changed `RefreshTokenPayload` non-additively to require `email`, violating the SDD requirement that existing token signing semantics remain unchanged.

**Where**: `src/auth/domain/ports/token.service.ts`, `src/auth/application/use-cases/login.use-case.ts`, `src/auth/application/use-cases/register.use-case.ts`, `src/auth/application/use-cases/refresh.use-case.ts`, `src/auth/domain/ports/auth-user.repository.ts`, `src/auth/infrastructure/persistence/prisma-auth-user.repository.ts`, `src/auth/infrastructure/security/jwt-token.service.spec.ts`, `test/auth.e2e-spec.ts`.

**Learned**: Refresh JWTs should remain minimal (`sub` only for existing contract) while access-token minting during refresh can load current user data via an auth domain port. `jti` can be added by the infrastructure service internally without exposing new caller requirements.

## TDD Cycle Evidence

| Cycle | Layer | Test / Artifact | Evidence | Result |
|---|---|---|---|---|
| Unit RED for refresh use case before implementation | Unit | `src/auth/application/use-cases/refresh.use-case.spec.ts` | Partial evidence. The tasks artifact required `npm test -- --reporter=verbose refresh.use-case` as the RED gate, but the exact RED command output is not available in this session transcript. The test file was created before core implementation and later verified GREEN. | ⚠️ Partial RED evidence; implementation history supports TDD order, but exact RED output cannot be quoted. |
| E2E RED for old-token reuse | E2E | `test/auth.e2e-spec.ts` | `npm run test:e2e` failed in `POST /api/v1/auth/refresh returns 200 with a new token pair; old token is revoked`: expected 401 Unauthorized, got 200 OK. Cause: old refresh token accepted because the new refresh JWT could be identical when reissued in the same second with same payload. | ✅ RED captured; failure identified real rotation bug. |
| GREEN after internal refresh-token `jti` | Unit + E2E | `src/auth/infrastructure/security/jwt-token.service.spec.ts`, `test/auth.e2e-spec.ts` | `npm test -- --reporter=verbose jwt-token.service` ✅ 3 passed. `npm run test:e2e -- test/auth.e2e-spec.ts -t "Auth refresh token endpoint"` ✅ 3 passed, 7 skipped. | ✅ GREEN after adding internal `jti` uniqueness. |
| GREEN after contract remediation preserving sub-only refresh payload | Unit + E2E | `refresh.use-case`, `jwt-token.service`, `login.use-case`, `register.use-case`, auth refresh E2E | `npm test -- --reporter=verbose refresh.use-case jwt-token.service login.use-case register.use-case` ✅ 14 passed. `npm run test:e2e -- test/auth.e2e-spec.ts -t "Auth refresh token endpoint"` ✅ 3 passed, 7 skipped. | ✅ GREEN after restoring `RefreshTokenPayload` to sub-only and loading user email through `AuthUserRepository.findById`. |
| Final unit verification | Unit | Full unit suite | `npm test` ✅ 40 files / 156 tests passed. | ✅ Passed. |
| Final E2E verification | E2E | Full E2E suite | `npm run test:e2e` ✅ 8 files / 81 tests passed. | ✅ Passed. |

## Caveats

- The initial `refresh.use-case` RED output is not available in the session transcript, so it is recorded as partial evidence rather than invented.
- The E2E RED and all subsequent GREEN verification commands/results are taken from observed session outputs.

## Status

All implementation tasks are complete and final verification passed. Recommended next step: `sdd-verify` / gatekeeper rerun.
