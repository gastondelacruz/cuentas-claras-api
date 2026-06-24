# Auth Logout Specification

## Purpose

Protected endpoint for revoking a specific refresh token by deterministic digest lookup, with idempotent 204 responses that never leak token state.

## Requirements

### Requirement: Logout endpoint

The system MUST expose `POST /api/v1/auth/logout` as a protected endpoint requiring a valid access token (JWT guard). It MUST accept `{ refreshToken: string }` and MUST return `204 No Content` with an empty body in all cases.

#### Scenario: Successful logout revokes active token

- GIVEN an authenticated user with an active refresh token
- WHEN the client sends `POST /api/v1/auth/logout` with `{ refreshToken }` matching that token
- THEN the system SHALL set `revokedAt = now` on the matching `RefreshToken` row
- AND SHALL return `204 No Content`

#### Scenario: Unauthenticated request rejected

- GIVEN no valid access token in the Authorization header
- WHEN the client sends `POST /api/v1/auth/logout`
- THEN the system SHALL return `401 Unauthorized`

### Requirement: Logout DTO validation

The system MUST validate `LogoutRequestDto` with `refreshToken` as a required non-empty string. Invalid input MUST be rejected as a validation error before reaching the use case.

#### Scenario: Missing refreshToken field

- GIVEN a request body without `refreshToken`
- WHEN it reaches the endpoint
- THEN the system SHALL reject it as a validation error

#### Scenario: Empty refreshToken string

- GIVEN a request body with `refreshToken: ""`
- WHEN it reaches the endpoint
- THEN the system SHALL reject it as a validation error

### Requirement: LogoutUseCase digest-based revocation

`LogoutUseCase` MUST compute HMAC-SHA256 digest of the raw refresh token, call `RefreshTokenRepository.findByDigest(digest)`, and revoke only if the token exists, belongs to the authenticated user (`userId` match), and is active (`revokedAt` is null). Otherwise it MUST do nothing. It MUST always succeed (idempotent, no exceptions).

#### Scenario: Token not found by digest

- GIVEN a refresh token whose digest matches no stored row
- WHEN `LogoutUseCase.execute` runs
- THEN it SHALL return successfully without modifying any data

#### Scenario: Token belongs to another user

- GIVEN a stored refresh token whose `userId` differs from the authenticated user
- WHEN `LogoutUseCase.execute` runs
- THEN it SHALL return successfully without revoking

#### Scenario: Token already revoked

- GIVEN a stored refresh token with `revokedAt` already set
- WHEN `LogoutUseCase.execute` runs
- THEN it SHALL return successfully without modifying the row

### Requirement: Port extensions for logout

The system MUST add to `RefreshTokenRepository`:

| Method | Signature |
|--------|-----------|
| `findByDigest` | `(digest: string) => Promise<RefreshToken \| null>` |

The system MUST add to a `TokenDigestService` port (or extend existing `TokenService`):

| Method | Signature |
|--------|-----------|
| `digest` | `(rawToken: string) => string` |

#### Scenario: Ports are additive

- GIVEN existing `RefreshTokenRepository` methods
- WHEN `findByDigest` is added
- THEN existing method signatures SHALL remain unchanged

### Requirement: Prisma schema — tokenDigest column

The `RefreshToken` model MUST add `tokenDigest String @unique` as a non-null column. A Prisma migration MUST be generated for this change.

#### Scenario: Unique constraint enforced

- GIVEN two refresh tokens
- WHEN both attempt to store the same `tokenDigest`
- THEN the database SHALL reject the second insert with a unique constraint violation

### Requirement: Logout unit test coverage

`logout.use-case.spec.ts` MUST cover all `LogoutUseCase` branches.

#### Scenario: Unit test cases

- GIVEN `LogoutUseCase` unit tests
- WHEN executed
- THEN they SHALL cover: active token revoked (sets `revokedAt`), token already revoked returns success, token not found returns success, token belongs to another user returns success

### Requirement: Logout E2E test coverage

E2E tests MUST verify that after logout the revoked refresh token is no longer usable.

#### Scenario: Refresh fails after logout

- GIVEN a user who logged in and received tokens
- WHEN the user calls `POST /api/v1/auth/logout` with the refresh token
- AND then calls `POST /api/v1/auth/refresh` with the same token
- THEN the refresh call SHALL return `401`
