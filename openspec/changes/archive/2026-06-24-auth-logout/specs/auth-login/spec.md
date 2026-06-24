# Delta for auth-login

## MODIFIED Requirements

### Requirement: Token issuance and refresh-token persistence

The system MUST, on successful login, sign an access token and refresh token through the existing `TokenService`.

The system MUST hash the raw refresh token with `PasswordHasher.hash` and persist it via `RefreshTokenRepository.save`.

The system MUST compute an HMAC-SHA256 digest of the raw refresh token via `TokenDigestService.digest` and include `tokenDigest` in the persisted refresh token record alongside the argon2 hash.

The system MUST create a new stored refresh token for every successful login and MUST NOT revoke previously issued refresh tokens.

(Previously: No digest was computed or stored; only the argon2 hash was persisted.)

#### Scenario: Login persists a new refresh token

- GIVEN valid credentials for an existing user
- WHEN login succeeds
- THEN the system SHALL persist one newly hashed refresh token
- AND the persisted record SHALL include a `tokenDigest` value
- AND previously stored refresh tokens SHALL remain valid records
