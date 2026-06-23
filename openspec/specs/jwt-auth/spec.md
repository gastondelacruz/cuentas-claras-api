# JWT Auth Specification

## Purpose

Token-based route protection: validate Bearer tokens, populate request.user, and allow public route bypass.

## Requirements

### Requirement: JWT Strategy Token Validation

The system MUST validate `Authorization: Bearer <token>` headers using `passport-jwt` with the secret from `authConfig.accessTokenSecret` (injected via constructor, NOT from `JwtModule` config).

The system MUST extract `{ sub, email }` from the token payload and set `request.user = { userId: sub, email }`.

#### Scenario: Valid token populates request.user

- GIVEN a request with a valid, non-expired Bearer token containing `{ sub: "user-1", email: "a@b.com" }`
- WHEN the request reaches a protected route
- THEN `request.user` SHALL equal `{ userId: "user-1", email: "a@b.com" }`

#### Scenario: Expired token rejected

- GIVEN a request with an expired Bearer token
- WHEN the request reaches a protected route
- THEN the system SHALL return 401 Unauthorized

#### Scenario: Malformed token rejected

- GIVEN a request with `Authorization: Bearer invalid-garbage`
- WHEN the request reaches a protected route
- THEN the system SHALL return 401 Unauthorized

#### Scenario: Missing Authorization header

- GIVEN a request with no Authorization header
- WHEN the request reaches a protected route
- THEN the system SHALL return 401 Unauthorized

### Requirement: JWT Auth Guard with Public Bypass

The system MUST register `JwtAuthGuard` as `APP_GUARD` so it applies globally to all routes.

The guard MUST check for `IS_PUBLIC_KEY` metadata via `Reflector`. If present, the request SHALL pass without token validation.

#### Scenario: Public route allows unauthenticated access

- GIVEN `@Public()` is applied to a route handler
- WHEN a request arrives without an Authorization header
- THEN the system SHALL allow the request through
- AND the route handler SHALL execute normally

#### Scenario: Non-public route requires token

- GIVEN a route without `@Public()` decorator
- WHEN a request arrives without a valid Bearer token
- THEN the system SHALL return 401 Unauthorized

### Requirement: Public Decorator Coverage

The `@Public()` decorator MUST be applied to exactly: `POST /auth/register`, `POST /auth/login`, `GET /health`.

All other routes MUST require authentication by default.

#### Scenario: Login is public

- GIVEN the `/api/v1/auth/login` endpoint
- WHEN a POST request arrives without Authorization
- THEN the system SHALL process the login normally

#### Scenario: Health check is public

- GIVEN the `/health` endpoint
- WHEN a GET request arrives without Authorization
- THEN the system SHALL return 200

#### Scenario: Groups endpoint is protected

- GIVEN the `/api/v1/groups` endpoint
- WHEN a GET request arrives without Authorization
- THEN the system SHALL return 401
