# UserId Threading Specification

## Purpose

Replace hardcoded `DEV_USER_ID` with real authenticated userId from JWT tokens across all use cases.

## Requirements

### Requirement: Groups Use Cases Receive userId

All 8 groups use cases MUST accept `userId: string` as the first parameter of `execute()`. Controllers MUST inject `@CurrentUser('sub') userId: string` and pass it. No use case SHALL import or reference `DEV_USER_ID`.

#### Scenario: Create group uses authenticated userId

- GIVEN an authenticated user with `userId: "user-1"`
- WHEN the user creates a group via `POST /api/v1/groups`
- THEN the use case SHALL receive `"user-1"` as `userId` parameter
- AND the group SHALL be created with `"user-1"` as creator

#### Scenario: List groups scoped to authenticated user

- GIVEN an authenticated user with `userId: "user-1"`
- WHEN the user requests `GET /api/v1/groups`
- THEN only groups belonging to `"user-1"` SHALL be returned

### Requirement: Expenses Use Cases Receive userId

All 4 expenses use cases MUST accept `userId: string` as the first parameter of `execute()`. Controllers MUST inject `@CurrentUser('sub') userId: string`. No use case SHALL import or reference `DEV_USER_ID`.

#### Scenario: Create expense uses authenticated userId

- GIVEN an authenticated user with `userId: "user-1"`
- WHEN the user creates an expense via `POST /api/v1/groups/:groupId/expenses`
- THEN the use case SHALL receive `"user-1"` as `userId` parameter

### Requirement: Me Use Case Receives userId

`get-me-summary.use-case.ts` MUST accept `userId: string` as first parameter of `execute()`. It MUST NOT reference `DEV_USER_ID`.

#### Scenario: Me summary scoped to authenticated user

- GIVEN an authenticated user with `userId: "user-1"`
- WHEN the user requests `GET /api/v1/me/summary`
- THEN the summary SHALL reflect only `"user-1"` data

### Requirement: DEV_USER_ID Runtime Isolation

`DEV_USER_ID` MUST exist ONLY in `prisma/seed.ts`. There SHALL be zero imports or references to `DEV_USER_ID` in `src/` (including `group.mapper.ts` inline hardcoded values).

#### Scenario: No DEV_USER_ID in source

- GIVEN the complete `src/` directory
- WHEN searched for `DEV_USER_ID` or its hardcoded UUID value
- THEN zero matches SHALL be found

#### Scenario: Seed script retains DEV_USER_ID

- GIVEN `prisma/seed.ts`
- WHEN the seed runs
- THEN it SHALL use `DEV_USER_ID` for seeding test data
