# Delta for auth-refresh-token-rotation

## MODIFIED Requirements

### Requirement: Token verification via JWT + argon2 iteration

The system MUST verify the refresh token in two steps: (1) `TokenService.verifyRefreshToken(rawToken)` to extract `userId` from JWT, (2) `RefreshTokenRepository.findActiveByUserId(userId)` + `PasswordHasher.verify` iteration to find the matching hash.

When creating the new rotated refresh token, the system MUST compute and store `tokenDigest` via `TokenDigestService.digest` alongside the argon2 hash, matching the login issuance contract.

(Previously: Rotated token creation stored only the argon2 hash without a digest.)

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
