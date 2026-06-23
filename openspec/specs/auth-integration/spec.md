# Auth Integration Specification

## Purpose

Swagger documentation, unit test updates, and E2E test infrastructure for JWT auth protection.

## Requirements

### Requirement: Swagger Bearer Auth Configuration

`@ApiBearerAuth()` MUST be applied to all protected controllers (groups, expenses, me). The Bearer auth security scheme MUST be configured in `main.ts` or Swagger setup via `addBearerAuth()`.

#### Scenario: Swagger shows lock icon on protected endpoints

- GIVEN Swagger UI at `/docs`
- WHEN viewing a protected endpoint (e.g., `GET /api/v1/groups`)
- THEN the endpoint SHALL display the bearer auth lock icon

#### Scenario: Swagger authorize enables authenticated requests

- GIVEN a valid access token entered in Swagger's Authorize dialog
- WHEN sending a request to a protected endpoint
- THEN the request SHALL include the `Authorization: Bearer <token>` header

### Requirement: Unit Test Updates for userId Threading

All refactored use case unit specs MUST pass `userId` as the first argument to `execute()`. Test mocks and stubs MUST be updated to expect the new signature.

#### Scenario: Unit tests pass with userId parameter

- GIVEN a refactored use case spec (e.g., `create-group.use-case.spec.ts`)
- WHEN the test calls `execute("user-1", ...args)`
- THEN the use case SHALL receive `userId` and the test SHALL pass

#### Scenario: No DEV_USER_ID in test files under src/

- GIVEN unit test files in `src/**/*.spec.ts`
- WHEN searched for `DEV_USER_ID` imports
- THEN zero matches SHALL be found

### Requirement: E2E Auth Helper and Scenarios

A shared `test/auth-helper.ts` MUST export `registerAndLogin(app): Promise<{ accessToken, userId }>` that registers a unique user and logs in, returning a valid token.

#### Scenario: Unauthenticated request returns 401

- GIVEN the application running with JWT guard active
- WHEN a request to `GET /api/v1/groups` is sent without Authorization
- THEN the response SHALL be 401 Unauthorized

#### Scenario: Authenticated request returns data

- GIVEN a valid `accessToken` from `registerAndLogin(app)`
- WHEN a request to `GET /api/v1/groups` includes `Authorization: Bearer <accessToken>`
- THEN the response SHALL be 200 with user-scoped data

#### Scenario: Existing e2e specs use auth helper

- GIVEN all existing e2e spec files for groups, expenses, and me
- WHEN they make requests to protected endpoints
- THEN they MUST use `registerAndLogin(app)` to obtain a valid token
- AND all e2e tests SHALL pass with `npm run test:e2e`
