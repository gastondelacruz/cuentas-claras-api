# Auth Registration Specification

## Purpose

Email/password user registration — the first auth slice. Provides account creation with uniqueness enforcement, secure credential storage, and JWT token pair issuance.

## Requirements

### Requirement: Register Endpoint

The system MUST expose `POST /api/v1/auth/register` accepting `{ email, password, name }` and returning `{ accessToken, refreshToken, user: { id, name, email } }` with HTTP 201.

#### Scenario: Happy path — valid registration

- GIVEN no user exists with email "new@example.com"
- WHEN POST /api/v1/auth/register with `{ email: "new@example.com", password: "SecureP4ss!", name: "Jane" }`
- THEN response status is 201
- AND body contains `{ data: { accessToken, refreshToken, user: { id, name: "Jane", email: "new@example.com" } } }`
- AND `passwordHash` is NOT present in the response

### Requirement: Email Uniqueness

The system MUST reject registration when the email is already taken, returning BusinessException with code `EMAIL_ALREADY_EXISTS` and HTTP 409.

#### Scenario: Duplicate email

- GIVEN a user exists with email "taken@example.com"
- WHEN POST /api/v1/auth/register with `{ email: "taken@example.com", password: "SecureP4ss!", name: "Dup" }`
- THEN response status is 409
- AND body contains error code `EMAIL_ALREADY_EXISTS`

### Requirement: Input Validation

The system MUST validate the registration DTO using class-validator. Invalid input returns HTTP 400.

| Field    | Rule                        |
|----------|-----------------------------|
| email    | Required, valid email format |
| password | Required, min 8 characters   |
| name     | Required, non-empty string   |

#### Scenario: Invalid email format

- GIVEN any state
- WHEN POST /api/v1/auth/register with `{ email: "not-an-email", password: "SecureP4ss!", name: "Jane" }`
- THEN response status is 400

#### Scenario: Missing password

- GIVEN any state
- WHEN POST /api/v1/auth/register with `{ email: "a@b.com", name: "Jane" }`
- THEN response status is 400

#### Scenario: Password too short

- GIVEN any state
- WHEN POST /api/v1/auth/register with `{ email: "a@b.com", password: "short", name: "Jane" }`
- THEN response status is 400

#### Scenario: Missing name

- GIVEN any state
- WHEN POST /api/v1/auth/register with `{ email: "a@b.com", password: "SecureP4ss!" }`
- THEN response status is 400

### Requirement: Secure Password Storage

The system MUST hash passwords with argon2 before persistence. Plaintext passwords SHALL NOT be stored.

#### Scenario: Password hashed before storage

- GIVEN a valid registration request
- WHEN the use case persists the user
- THEN `PasswordHasher.hash()` is called with the plaintext password
- AND the stored `passwordHash` is NOT equal to the plaintext

### Requirement: Token Issuance

The system MUST issue a JWT access token (TTL 15 minutes) and a refresh token (TTL 30 days) on successful registration.

#### Scenario: Tokens issued with correct TTLs

- GIVEN a successful registration
- WHEN tokens are signed
- THEN `TokenService.signAccessToken()` is called with user payload
- AND `TokenService.signRefreshToken()` is called with user payload
- AND both tokens are returned in the response

### Requirement: Refresh Token Persistence

The system MUST store the refresh token as a hash (not plaintext) in the `RefreshToken` table with `userId`, `tokenHash`, and `expiresAt`.

#### Scenario: Refresh token stored as hash

- GIVEN a successful registration producing a refresh token
- WHEN the token is persisted
- THEN `RefreshTokenRepository.save()` is called with `{ userId, tokenHash, expiresAt }`
- AND `tokenHash` is NOT equal to the plaintext refresh token

## Port Contracts

| Port                    | Method                                        | Returns                   |
|-------------------------|-----------------------------------------------|---------------------------|
| PasswordHasher          | `hash(plain: string)`                         | `Promise<string>`         |
| PasswordHasher          | `verify(plain: string, hashed: string)`       | `Promise<boolean>`        |
| TokenService            | `signAccessToken(payload: TokenPayload)`      | `Promise<string>`         |
| TokenService            | `signRefreshToken(payload: TokenPayload)`     | `Promise<string>`         |
| AuthUserRepository      | `findByEmail(email: string)`                  | `Promise<User \| null>`   |
| AuthUserRepository      | `createWithPassword(data: CreateUserData)`    | `Promise<User>`           |
| RefreshTokenRepository  | `save(data: SaveRefreshTokenData)`            | `Promise<void>`           |

## Schema Contracts

**User model additions**: `passwordHash String? @map("password_hash")`, `googleId String? @unique @map("google_id")`

**RefreshToken model (new)**: `id` uuid PK, `userId` FK->User (onDelete Cascade), `tokenHash` String, `expiresAt` DateTime, `revokedAt` DateTime?, `createdAt` DateTime @default(now()), `@@index([userId])`, `@@map("refresh_tokens")`

## Config Contract

`registerAs("auth")`: `JWT_ACCESS_SECRET`, `JWT_ACCESS_TTL` (default "15m"), `JWT_REFRESH_SECRET`, `JWT_REFRESH_TTL` (default "30d"), `GOOGLE_CLIENT_ID` (optional).

## Non-Functional Requirements

- NFR-1: Hexagonal layout identical to existing modules (groups, users) — ports as abstract classes for DI tokens.
- NFR-2: No existing module behavior changes — `DEV_USER_ID` stub remains.
