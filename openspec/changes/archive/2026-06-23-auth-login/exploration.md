## Exploration: auth-login

### Current State
`src/auth/` already exists as a hexagonal module for registration. The current flow is `AuthController -> AuthMapper -> RegisterUseCase -> AuthUserRepository / PasswordHasher / TokenService / RefreshTokenRepository`, with Prisma adapters and Argon2/JWT infrastructure already wired in `AuthModule`. The user model already has `passwordHash` and `googleId` fields, but `AuthUserRepository.findByEmail()` currently returns only `{ id, name, email }`, so the login use case cannot yet distinguish password accounts from Google-only accounts without a port change.

### Affected Areas
- `src/auth/application/use-cases/` — add `login.use-case.ts` and its unit spec; reuse registration ports and token flow.
- `src/auth/domain/ports/auth-user.repository.ts` — extend the repository contract so login can read `passwordHash` (or a dedicated login projection).
- `src/auth/infrastructure/persistence/prisma-auth-user.repository.ts` — include `passwordHash` in the login query projection if the port is widened.
- `src/auth/infrastructure/http/` — add login DTOs, mapper methods, and `POST /api/v1/auth/login` in `auth.controller.ts`.
- `src/auth/auth.module.ts` — register the new use case provider.
- `test/auth.e2e-spec.ts` — add login happy-path and invalid-credentials coverage.
- `openspec/changes/auth-login/` — new change folder; do not modify `auth-registration` artifacts.

### Approaches
1. **Widen `AuthUserRepository` projection** — extend `findByEmail()` to return `passwordHash` as an optional field and let login use that field directly.
   - Pros: smallest change, reuses one repository method, no extra query surface.
   - Cons: registration code now sees a richer user shape than it needs; response mapping must continue to ignore the hash.
   - Effort: Low

2. **Add a dedicated login repository method** — keep `findByEmail()` unchanged and add `findByEmailWithPasswordHash()` (or similar) for the login path.
   - Pros: tighter projection boundaries; registration stays unchanged.
   - Cons: more port surface and adapter duplication for a single auth use case.
   - Effort: Medium

### Recommendation
Use **Approach 1** unless the team wants stricter read-model separation. It is enough for the requested scope and keeps the login slice minimal: lookup user, reject missing/Google-only accounts with the same generic `invalid credentials` business error, verify the password with Argon2, issue tokens, hash/persist the refresh token, and return the same response shape as registration.

### Risks
- Returning `passwordHash` from the repository could accidentally leak into mappers/tests if the response boundary is not kept strict.
- The requested generic `invalid credentials` message must be reused for three cases (missing user, Google-only account, bad password) to avoid user enumeration.
- E2E coverage must assert `401` for invalid credentials, which depends on the existing global exception filter mapping `BusinessException` correctly.

### Ready for Proposal
Yes — the minimal SDD scope is clear: add the login use case, DTO/controller route, one repository contract adjustment, and unit/E2E tests, while leaving the auth-registration path intact.
