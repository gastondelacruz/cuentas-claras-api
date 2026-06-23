# Delta for Auth Login

## ADDED Requirements

### Requirement: Email/password login

The system MUST allow an existing user to authenticate with email and password through `POST /api/v1/auth/login`.

The system MUST normalize the submitted email by trimming whitespace and converting it to lowercase before lookup and validation.

#### Scenario: Successful login

- GIVEN a registered user with a stored password hash
- WHEN the client submits valid email and password credentials
- THEN the system SHALL return the same token pair and user projection as registration
- AND the response SHALL be wrapped by the response interceptor

#### Scenario: Invalid credential input

- GIVEN any login request with a missing, malformed, or extra field that fails validation
- WHEN the request reaches the endpoint
- THEN the system SHALL reject it as a validation error

### Requirement: Generic invalid-credentials failure

The system MUST reject invalid login attempts with `BusinessException("INVALID_CREDENTIALS", "Invalid credentials.", 401)`.

The system MUST use the same failure for a nonexistent email, a user without a password hash, and a password verification mismatch.

#### Scenario: Nonexistent email

- GIVEN no user exists for the normalized email
- WHEN the client submits credentials
- THEN the system SHALL return `401` with `INVALID_CREDENTIALS`

#### Scenario: Google-only account

- GIVEN a user exists but has no password hash because the account is Google-only
- WHEN the client submits any password
- THEN the system SHALL return the same generic invalid-credentials failure

### Requirement: Token issuance and refresh-token persistence

The system MUST, on successful login, sign an access token and refresh token through the existing `TokenService`.

The system MUST hash the raw refresh token with `PasswordHasher.hash` and persist it via `RefreshTokenRepository.save`.

The system MUST create a new stored refresh token for every successful login and MUST NOT revoke previously issued refresh tokens.

#### Scenario: Login persists a new refresh token

- GIVEN valid credentials for an existing user
- WHEN login succeeds
- THEN the system SHALL persist one newly hashed refresh token
- AND previously stored refresh tokens SHALL remain valid records

### Requirement: Auth user lookup projection

The system MUST allow the login use case to read `passwordHash` safely from the auth user repository when needed.

The system MUST NOT expose `passwordHash` in HTTP responses or response mappers.

#### Scenario: Safe password-hash access

- GIVEN the login use case needs credential verification data
- WHEN it loads the user projection
- THEN the projection SHALL include only the fields required for verification
- AND the HTTP response SHALL exclude `passwordHash`

### Requirement: Login test coverage

The system MUST include unit and E2E coverage for login behavior.

#### Scenario: Unit coverage

- GIVEN the login use case
- WHEN tests execute
- THEN they SHALL cover success, incorrect password, nonexistent email, and Google-only/no-password-hash cases

#### Scenario: E2E coverage

- GIVEN a registered user in the real application flow
- WHEN the user logs in successfully
- THEN the endpoint SHALL return `200`
- AND invalid credentials SHALL return `401`
