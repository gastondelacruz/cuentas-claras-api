# Auth Refresh Token Rotation Specification

## Purpose

Secure refresh token rotation endpoint that exchanges a valid refresh token for a new access+refresh pair, revoking the old token and detecting reuse attempts.

## Requirements

### Requirement: Refresh endpoint

The system MUST expose `POST /api/v1/auth/refresh` as a public (unauthenticated) endpoint accepting `{ refreshToken: string }`.

The system MUST return `{ accessToken, refreshToken }` matching the login response shape, wrapped by `ResponseInterceptor`.

#### Scenario: Successful rotation

- GIVEN a user with a valid, non-revoked refresh token
- WHEN the client sends `POST /api/v1/auth/refresh` with that token
- THEN the system SHALL return a new `{ accessToken, refreshToken }` pair
- AND the old refresh token SHALL be revoked
- AND the new refresh token hash SHALL be persisted

#### Scenario: Request validation

- GIVEN a request with missing or non-string `refreshToken` field
- WHEN it reaches the endpoint
- THEN the system SHALL reject it as a validation error

### Requirement: Token verification via JWT + argon2 iteration

The system MUST verify the refresh token in two steps: (1) `TokenService.verifyRefreshToken(rawToken)` to extract `userId` from JWT, (2) `RefreshTokenRepository.findActiveByUserId(userId)` + `PasswordHasher.verify` iteration to find the matching hash.

When creating the new rotated refresh token, the system MUST compute and store `tokenDigest` via `TokenDigestService.digest` alongside the argon2 hash, matching the login issuance contract.

#### Scenario: JWT signature invalid

- GIVEN a refresh token with an invalid or tampered JWT signature
- WHEN the system verifies it
- THEN it SHALL throw `BusinessException(INVALID_REFRESH_TOKEN, 401)`

#### Scenario: JWT expired

- GIVEN a refresh token whose JWT TTL has elapsed
- WHEN the system verifies it
- THEN it SHALL throw `BusinessException(INVALID_REFRESH_TOKEN, 401)`

#### Scenario: No active tokens for user

- GIVEN a valid JWT but `findActiveByUserId` returns an empty list
- WHEN the system iterates candidates
- THEN it SHALL throw `BusinessException(INVALID_REFRESH_TOKEN, 401)`

#### Scenario: Successful rotation stores digest

- GIVEN a valid refresh token that matches an active hash
- WHEN rotation succeeds
- THEN the new persisted refresh token SHALL include a `tokenDigest` value

### Requirement: Reuse detection

The system MUST detect refresh token reuse. When a token's JWT is valid but no argon2 match is found among active tokens, the system MUST call `revokeAllByUserId(userId)` and throw `BusinessException(INVALID_REFRESH_TOKEN, 401)`.

#### Scenario: Reuse detection triggers revocation

- GIVEN a user with active refresh tokens
- AND a previously rotated (revoked) token is presented
- WHEN the JWT is valid but no active token hash matches
- THEN the system SHALL revoke ALL active tokens for that user
- AND SHALL throw `BusinessException(INVALID_REFRESH_TOKEN, 401)`

### Requirement: Old token invalidation

After successful rotation, the old refresh token MUST NOT be usable for another refresh.

#### Scenario: Old token rejected after rotation

- GIVEN a successful rotation that returned a new pair
- WHEN the client reuses the old refresh token
- THEN the system SHALL return 401 `INVALID_REFRESH_TOKEN`

### Requirement: Port extensions

The system MUST add these port methods as additive extensions (no breaking changes):

| Port | Method | Signature |
|------|--------|-----------|
| `RefreshTokenRepository` | `findActiveByUserId` | `(userId: string) => Promise<RefreshToken[]>` |
| `RefreshTokenRepository` | `revoke` | `(id: string) => Promise<void>` |
| `RefreshTokenRepository` | `revokeAllByUserId` | `(userId: string) => Promise<void>` |
| `TokenService` | `verifyRefreshToken` | `(token: string) => Promise<{ sub: string }>` |

#### Scenario: Ports are additive

- GIVEN existing implementations of `RefreshTokenRepository` and `TokenService`
- WHEN new methods are added
- THEN existing method signatures SHALL remain unchanged

### Requirement: Test coverage

The system MUST include unit tests for `RefreshUseCase` and E2E tests for the endpoint.

#### Scenario: Unit test cases

- GIVEN `RefreshUseCase` unit tests
- WHEN executed
- THEN they SHALL cover: rotation OK, revoked/no-match token, empty active list, expired JWT, reuse detection

#### Scenario: E2E test cases

- GIVEN a running app with DB
- WHEN E2E tests execute
- THEN they SHALL cover: login -> refresh -> verify new access token works, old token rejected after rotation, invalid token returns 401
