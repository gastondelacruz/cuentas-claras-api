# Delta for Auth Login

## MODIFIED Requirements

### Requirement: Token issuance and refresh-token persistence

The system MUST, on successful login, sign an access token and refresh token through the existing `TokenService`.

The system MUST hash the raw refresh token with `PasswordHasher.hash` and persist it via `RefreshTokenRepository.save`.

The system MUST create a new stored refresh token for every successful login and MUST NOT revoke previously issued refresh tokens.

(Previously: Port contracts unchanged; this delta documents that `RefreshTokenRepository` and `TokenService` abstract classes now include additional methods for refresh rotation, but login behavior itself is unaffected.)

#### Scenario: Login persists a new refresh token

- GIVEN valid credentials for an existing user
- WHEN login succeeds
- THEN the system SHALL persist one newly hashed refresh token
- AND previously stored refresh tokens SHALL remain valid records

#### Scenario: Login unaffected by new port methods

- GIVEN `RefreshTokenRepository` and `TokenService` have new methods for rotation
- WHEN the login use case executes
- THEN it SHALL use only `save` and `signTokens` as before
- AND SHALL NOT call `findActiveByUserId`, `revoke`, `revokeAllByUserId`, or `verifyRefreshToken`
