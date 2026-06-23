# Proposal: Auth Login

## Intent

Add email/password login on top of the existing `src/auth` registration foundation so registered users can obtain the same token pair and user payload after authentication. The login flow must avoid account enumeration and treat missing users, wrong passwords, and Google-only accounts as the same invalid-credentials failure.

## Scope

### In Scope
- `POST /api/v1/auth/login` with validated email/password DTO.
- `LoginUseCase` that normalizes email, finds the user, verifies Argon2 password, issues token pair, and persists a newly hashed refresh token.
- Unit and E2E coverage for success and generic invalid-credentials paths.

### Out of Scope
- Google login or account-linking guidance.
- Revoking previous refresh tokens on login.
- Changes to registration behavior or auth-registration planning artifacts.

## Capabilities

### New Capabilities
- `auth-login`: Email/password authentication for existing users, including generic credential failures, token issuance, and refresh-token persistence.

### Modified Capabilities
- None.

## Approach

Reuse the existing auth hexagon: controller and HTTP mapper call a new `LoginUseCase`; the use case depends only on auth ports. Extend `AuthUserRepository` only as needed so login can read `passwordHash`. Return `BusinessException` code `INVALID_CREDENTIALS` with message `Invalid credentials.` for missing user, missing hash, or failed verification. Reuse `PasswordHasher`, `TokenService`, and `RefreshTokenRepository` to match registration response semantics.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/auth/application/use-cases/` | New | Login orchestration and unit tests. |
| `src/auth/domain/ports/` | Modified | User lookup projection may include password hash. |
| `src/auth/infrastructure/persistence/` | Modified | Prisma user query supports login credentials lookup. |
| `src/auth/infrastructure/http/` | Modified | Login DTO, mapper, Swagger metadata, and route. |
| `src/auth/auth.module.ts` | Modified | Register login use case provider. |
| `test/auth.e2e-spec.ts` | Modified | Login success after registration and invalid credentials coverage. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Password hash leaks past the HTTP boundary | Low | Keep mapper response identical to register; never expose persistence projection directly. |
| Error differences enable user enumeration | Medium | Use one `INVALID_CREDENTIALS` code/message/status for all credential failures. |
| Refresh-token persistence diverges from register | Low | Reuse existing token and refresh-token ports/adapters. |

## Rollback Plan

Remove the login route, use case, DTO/mapper additions, repository projection change, provider binding, and login tests. No schema rollback is expected.

## Dependencies

- Existing `auth-registration` implementation merged in `src/auth`.
- Existing Argon2, JWT, refresh-token repository, and global exception handling.

## Success Criteria

- [ ] Unit tests cover successful login, incorrect password, nonexistent email, and Google-only account.
- [ ] E2E covers registration followed by login returning `200`, and invalid credentials returning `401`.
- [ ] `npm run test && npm run test:e2e` passes.
