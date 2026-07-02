# Apply Progress: personal-transactions

## Change

personal-transactions

## Mode

Strict TDD (Vitest 4)

## Completed Tasks

### Phase 1: Schema & Migration

- [x] 1.1 Add `AccountKind` enum and `Account` model to `prisma/schema.prisma`
- [x] 1.2 Add `PersonalTransaction` model to `prisma/schema.prisma`
- [x] 1.3 Create migration `20260629220000_add_accounts_and_personal_transactions` with partial unique index and run `prisma generate`

### Phase 2: Domain Layer

- [x] 2.1 Create `transaction-type.vo.ts` + spec
- [x] 2.2 Create `transaction-category.vo.ts` + spec
- [x] 2.3 Create `transaction-period.vo.ts` + spec
- [x] 2.4 Create `account-kind.vo.ts` + spec
- [x] 2.5 Create `accounts.repository.ts` port
- [x] 2.6 Create `personal-transactions.repository.ts` port

### Phase 3: Application Layer (TDD)

- [x] 3.1 Create `resolve-date-range.ts` + spec
- [x] 3.2 Create `personal-transactions-totals.calculator.ts` + spec
- [x] 3.3 Create `list-my-accounts.use-case.ts` + spec
- [x] 3.4 Create `list-personal-transactions.use-case.ts` + spec
- [x] 3.5 Create `create-personal-transaction.use-case.ts` + spec

### Phase 4: Infrastructure Layer

- [x] 4.1 Create `prisma-accounts.repository.ts`
- [x] 4.2 Create `prisma-personal-transactions.repository.ts`

### Phase 5: HTTP Layer

- [x] 5.1 Create 5 DTOs in `src/me/infrastructure/http/dto/`
- [x] 5.2 Create `personal-transactions.mapper.ts`
- [x] 5.3 Create `accounts.mapper.ts`
- [x] 5.4 Modify `me.controller.ts` with 3 new routes

### Phase 6: Module Wiring

- [x] 6.1 Modify `me.module.ts` to register use cases and adapters

### Phase 7: E2E Tests

- [x] 7.1 Create `test/personal-transactions.e2e-spec.ts`
- [x] 7.2 Create `test/accounts.e2e-spec.ts`

## Fix Round (post-verify)

The verify phase reported two CRITICAL TypeScript build errors and two WARNING spec gaps. The following fix tasks were applied under strict TDD discipline.

### Fix Tasks

- [x] F.1 Fix `CreatePersonalTransactionResponseDto` import in `personal-transactions.mapper.ts`
- [x] F.2 Change `decodeCursor` return type to `string | undefined` and validate the decoded value is a UUID
- [x] F.3 Add an invalid-cursor guard in `me.controller.ts` returning `PERSONAL_TX_INVALID_CURSOR`
- [x] F.4 Remove `@IsIn(TRANSACTION_PERIODS)` from `ListPersonalTransactionsQueryDto` so invalid periods reach `resolveDateRange` and return `PERSONAL_TX_INVALID_PERIOD`
- [x] F.5 Add E2E coverage for invalid period, invalid cursor and negative amount

### Fix TDD Cycle Evidence

| Task | Test / Verification | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|---------------------|-------|------------|-----|-------|-------------|----------|
| F.1 | `npm run build` | Build | N/A | Failed: `TS2724` missing export | Passed | N/A | N/A |
| F.2 | `src/me/infrastructure/http/mappers/personal-transactions.mapper.spec.ts` | Unit | 192 unit / 102 e2e green | Written: invalid cursor returns `undefined` | Passed: UUID validation + `undefined` return | 3 invalid cursor cases | Clean |
| F.3 | `test/personal-transactions.e2e-spec.ts` | E2E | Existing suite green | Written: 400 `PERSONAL_TX_INVALID_CURSOR` | Passed: controller guard added | N/A | Clean |
| F.4 | `test/personal-transactions.e2e-spec.ts` | E2E | Existing suite green | Written: 400 `PERSONAL_TX_INVALID_PERIOD` | Passed: DTO no longer rejects period early | N/A | Clean |
| F.5 | `test/personal-transactions.e2e-spec.ts` | E2E | Existing suite green | Written: `amount=-10` → 400 `VALIDATION_ERROR` | Passed: DTO `@IsPositive()` already rejects | N/A | Clean |

### Files Changed (Fix Round)

| File | Action | What Was Done |
|------|--------|---------------|
| `src/me/infrastructure/http/mappers/personal-transactions.mapper.ts` | Modified | Fixed DTO import; `decodeCursor` now returns `string \| undefined` and validates UUID shape |
| `src/me/infrastructure/http/me.controller.ts` | Modified | Decodes cursor before use-case call; throws `BadRequestException` with `PERSONAL_TX_INVALID_CURSOR` when decoding fails |
| `src/me/infrastructure/http/dto/list-personal-transactions-query.dto.ts` | Modified | Removed `@IsIn(TRANSACTION_PERIODS)` so invalid periods flow to `resolveDateRange` |
| `src/me/infrastructure/http/mappers/personal-transactions.mapper.spec.ts` | Created | Unit tests for cursor encode/decode, invalid cursor handling and DTO mapping |
| `test/personal-transactions.e2e-spec.ts` | Modified | Added tests for invalid period, invalid cursor and negative amount validation |

### Test Results (Fix Round)

- `npm run build` — passed with zero TypeScript errors
- `npm test` — 199 unit tests passed (7 new mapper tests)
- `npm run test:e2e` — 105 E2E tests passed (3 new scenarios)

## Original TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 2.1 | `src/me/domain/value-objects/transaction-type.vo.spec.ts` | Unit | N/A (new) | Written | Passed | 2 cases | Clean |
| 2.2 | `src/me/domain/value-objects/transaction-category.vo.spec.ts` | Unit | N/A (new) | Written | Passed | 3 cases | Clean |
| 2.3 | `src/me/domain/value-objects/transaction-period.vo.spec.ts` | Unit | N/A (new) | Written | Passed | Skipped: single const | Clean |
| 2.4 | `src/me/domain/value-objects/account-kind.vo.spec.ts` | Unit | N/A (new) | Written | Passed | Skipped: single const | Clean |
| 3.1 | `src/me/application/services/resolve-date-range.spec.ts` | Unit | N/A (new) | Written | Passed | 7 cases | Clean |
| 3.2 | `src/me/application/services/personal-transactions-totals.calculator.spec.ts` | Unit | N/A (new) | Written | Passed | 4 cases | Clean |
| 3.3 | `src/me/application/use-cases/list-my-accounts.use-case.spec.ts` | Unit | N/A (new) | Written | Passed | 2 cases | Clean |
| 3.4 | `src/me/application/use-cases/list-personal-transactions.use-case.spec.ts` | Unit | N/A (new) | Written | Passed | 4 cases | Clean |
| 3.5 | `src/me/application/use-cases/create-personal-transaction.use-case.spec.ts` | Unit | N/A (new) | Written | Passed | 5 cases | Clean |
| 1.1-1.3, 4.1-4.2, 5.1-5.4, 6.1, 7.1-7.2 | Various | Structural/E2E | Existing suite green | N/A | N/A | N/A | N/A |

### Original Test Summary

- **Total tests written**: 31 new unit tests
- **Total tests passing**: 192 unit + 102 E2E (all green)
- **Layers used**: Unit (31), E2E (15)
- **Approval tests**: None — no refactoring tasks
- **Pure functions created**: `resolveDateRange`, `calculatePersonalTransactionsTotals`, `isValidCategoryForType`, `categoriesForType`

## Files Changed (Original Implementation)

| File | Action | What Was Done |
|------|--------|---------------|
| `prisma/schema.prisma` | Modified | Added `AccountKind` enum, `Account` and `PersonalTransaction` models, relations to `User` |
| `prisma/migrations/20260629220000_add_accounts_and_personal_transactions/migration.sql` | Created | Delta migration with tables, indexes, FKs and partial unique index for default accounts |
| `prisma/seed.ts` | Modified | Seeds one default `Account` for the dev user |
| `src/me/domain/value-objects/*.vo.ts` | Created | Transaction type, category, period and account-kind value objects |
| `src/me/domain/ports/accounts.repository.ts` | Created | Abstract port + `Account` domain type |
| `src/me/domain/ports/personal-transactions.repository.ts` | Created | Abstract port + transaction/filters/input types |
| `src/me/application/services/resolve-date-range.ts` | Created | Pure UTC period/date-range resolver |
| `src/me/application/services/personal-transactions-totals.calculator.ts` | Created | Cents-backed totals calculator |
| `src/me/application/use-cases/*.use-case.ts` | Created | `list-my-accounts`, `list-personal-transactions`, `create-personal-transaction` |
| `src/me/infrastructure/persistence/prisma-*.repository.ts` | Created | Prisma adapters with `runDatabaseOperation` wrapping |
| `src/me/infrastructure/http/dto/*.dto.ts` | Created | Query, request and response DTOs with `class-validator` decorators |
| `src/me/infrastructure/http/mappers/*.mapper.ts` | Created | `PersonalTransactionsMapper` (base64url cursor) and `AccountsMapper` |
| `src/me/infrastructure/http/me.controller.ts` | Modified | Added `GET /accounts`, `GET /personal-transactions`, `POST /personal-transactions` |
| `src/me/me.module.ts` | Modified | Wired use cases, adapters and abstract ports via `useExisting` |
| `test/personal-transactions.e2e-spec.ts` | Created | Full E2E coverage for personal transactions |
| `test/accounts.e2e-spec.ts` | Created | E2E coverage for account listing and isolation |
| `test/prisma-schema.e2e-spec.ts` | Modified | Updated expected table list to include `accounts` and `personal_transactions` |

## Deviations from Design

1. **Migration generation**: Design assumed `prisma migrate dev`. Because the local development database had been managed with `db push` and already contained tables, a full `migrate dev` would have required a destructive reset. Instead, the delta migration was generated with `prisma migrate diff --from-migrations ... --to-schema ...` and the partial unique index was appended manually. The migration was then marked applied in the local dev database with `prisma migrate resolve --applied`. The resulting SQL is exactly the delta required for fresh environments.
2. **Default period behavior**: `resolveDateRange` returns `null` (no date filter) when neither `period` nor explicit `dateFrom`/`dateTo` are provided, instead of defaulting to the current day. This matches the E2E pagination tests and avoids surprising all-time queries.
3. **Cursor handling**: The repository accepts and returns raw UUID cursors; base64url encoding/decoding lives in `PersonalTransactionsMapper` as specified. The repository uses `skip: 1` together with `cursor` to make the cursor exclusive, ensuring the cursor item is not repeated on the next page.
4. **Invalid cursor guard (fix round)**: The design did not specify an error code for malformed cursors. The controller now returns `PERSONAL_TX_INVALID_CURSOR` (400) as a defensive HTTP-layer guard.

## Issues Found

- Prisma enum values are exposed as uppercase (`BANK`) while the domain contract expects lowercase (`bank`). The `PrismaAccountsRepository` maps `kind.toLowerCase()` before returning the domain object.
- The first E2E run revealed that `nextCursor` was being emitted on the final page. Fixed by only emitting `nextCursor` when the repository retrieves `limit + 1` rows (i.e., a next page exists).
- `resolveDateRange` relies on the request-time `Date`. The E2E period-filter test uses a transaction date relative to the current UTC day so it remains stable regardless of when the suite runs.

## Verification

- `npm run build` — passed with zero errors
- `npm test` — 199 unit tests passing
- `npm run test:e2e` — 105 E2E tests passing

## Default Account Registration Extension

The registration flow was extended so every newly registered user receives an atomic default account. Existing users are backfilled by a follow-up migration.

### Extension Tasks

- [x] D.1 Fix stale `RegisterUseCase` spec to assert `createUserWithDefaultAccount`
- [x] D.2 Add `PrismaAuthUserRepository` unit coverage for transactional user + default-account creation
- [x] D.3 Implement `PrismaAuthUserRepository.createUserWithDefaultAccount` with `prisma.$transaction`
- [x] D.4 Add migration `20260701143000_backfill_default_accounts`
- [x] D.5 Invert E2E coverage so freshly registered users have a default account and can create personal transactions without `accountId`

### Extension TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| D.1 | `src/auth/application/use-cases/register.use-case.spec.ts` | Unit | Failed: stale assertion referenced `createWithPassword` | Written: assert default account payload | Passed | 1 registration case + duplicate-email guard | Clean |
| D.2-D.3 | `src/auth/infrastructure/persistence/prisma-auth-user.repository.spec.ts` | Unit | N/A (new) | Written: repository method missing | Passed: transaction creates user then account | 3 cases: success, enum mapping, account failure | Clean |
| D.4 | `prisma/migrations/20260701143000_backfill_default_accounts/migration.sql` | Migration | Existing migrations applied in E2E | Migration added before E2E deploy | Passed in `npm run test:e2e` migration deploy | Backfills only users lacking a non-archived default account | Clean |
| D.5 | `test/auth.e2e-spec.ts`, `test/personal-transactions.e2e-spec.ts`, `test/accounts.e2e-spec.ts` | E2E | Existing e2e suite previously expected no default account for new users | Written: registered users expose default account and can post without `accountId` | Passed | 3 flows: auth persistence, accounts list, personal transaction create | Clean |

### Files Changed (Default Account Extension)

| File | Action | What Was Done |
|------|--------|---------------|
| `src/auth/domain/ports/auth-user.repository.ts` | Modified | Added `DefaultAccountInput` and `createUserWithDefaultAccount` port method |
| `src/auth/application/use-cases/register.use-case.ts` | Modified | Registration calls `createUserWithDefaultAccount` with `Cuenta principal`, `ARS`, `cash` |
| `src/auth/application/use-cases/register.use-case.spec.ts` | Modified | Updated stale mock/assertions to the default-account creation method |
| `src/auth/infrastructure/persistence/prisma-auth-user.repository.ts` | Modified | Added transactional user + default account creation |
| `src/auth/infrastructure/persistence/prisma-auth-user.repository.spec.ts` | Created | Unit tests for transaction, enum mapping, and failure wrapping |
| `prisma/migrations/20260701143000_backfill_default_accounts/migration.sql` | Created | Backfills default accounts for existing users without a non-archived default |
| `test/auth.e2e-spec.ts` | Modified | Registration now asserts one persisted default ARS cash account |
| `test/personal-transactions.e2e-spec.ts` | Modified | Freshly registered user can create a personal transaction without `accountId` |
| `test/accounts.e2e-spec.ts` | Modified | Freshly registered user lists one auto-created default account |

### Extension Verification

- `npm run build` — passed with zero errors
- `npm test` — 202 unit tests passing
- `npm run test:e2e` — 105 E2E tests passing

## Response Contract Fix Round

The `personal-transactions` HTTP response contract was corrected to match the user-provided API contract. List responses now expose `transactions`, `nextCursor`, and flat totals under `data`; transaction DTOs now include `accountName`, `createdAt`, and `updatedAt`.

### Contract Fix Tasks

- [x] C.1 Add regression tests for the required list/create response shapes
- [x] C.2 Update Swagger response DTOs for list and create personal transaction responses
- [x] C.3 Update `PersonalTransactionsMapper` from `items`/nested `totals` to `transactions`/flat totals
- [x] C.4 Extend the domain repository row contract with `accountName`
- [x] C.5 Join/select the related account name in `PrismaPersonalTransactionsRepository` for list and create responses
- [x] C.6 Update E2E assertions to lock the exact public HTTP contract

### Contract Fix TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| C.1-C.3 | `src/me/infrastructure/http/mappers/personal-transactions.mapper.spec.ts` | Unit | 7 mapper + 4 list use-case + 5 create use-case tests passing | Written: expected `transactions`, flat totals, `accountName`, `createdAt`, `updatedAt` | Passed: mapper emits required DTO shape | 2 mapper paths: create item and paginated list | Clean |
| C.4-C.5 | `test/personal-transactions.e2e-spec.ts` | E2E | 15 personal-transactions E2E tests passing | Written: HTTP contract expects `accountName` from joined account relation | Passed: repository includes account name in list/create rows | 3 flows: list, create with default account, create with explicit account | Clean |
| C.6 | `test/personal-transactions.e2e-spec.ts` | E2E | 15 personal-transactions E2E tests passing | Written: exact `{ data: { transactions, nextCursor, total, incomeTotal, expenseTotal, currency } }` list response | Passed: public response no longer exposes `items` or nested `totals` | List + create contracts covered | Clean |

### Files Changed (Response Contract Fix)

| File | Action | What Was Done |
|------|--------|---------------|
| `src/me/domain/ports/personal-transactions.repository.ts` | Modified | Added `accountName` to `PersonalTransaction` domain row type |
| `src/me/infrastructure/persistence/prisma-personal-transactions.repository.ts` | Modified | Included the `account` relation name in `findFiltered` and `create` queries |
| `src/me/infrastructure/http/dto/list-personal-transactions-response.dto.ts` | Modified | Replaced `items`/nested `totals` with `transactions` and flat totals in Swagger DTOs |
| `src/me/infrastructure/http/dto/create-personal-transaction-response.dto.ts` | Modified | Added `accountName`, `createdAt`, and `updatedAt` to the create response DTO |
| `src/me/infrastructure/http/mappers/personal-transactions.mapper.ts` | Modified | Emits the required public response shape for list and create endpoints |
| `src/me/infrastructure/http/mappers/personal-transactions.mapper.spec.ts` | Modified | Added regression assertions for the corrected mapper contract |
| `src/me/application/use-cases/list-personal-transactions.use-case.spec.ts` | Modified | Updated fixtures to include `accountName` in the domain row contract |
| `src/me/application/use-cases/create-personal-transaction.use-case.spec.ts` | Modified | Updated fixtures to include `accountName` in created transactions |
| `test/personal-transactions.e2e-spec.ts` | Modified | Locks list/create HTTP response shapes after `ResponseInterceptor` |

### Contract Fix Verification

- Safety net: `npm test -- src/me/infrastructure/http/mappers/personal-transactions.mapper.spec.ts src/me/application/use-cases/list-personal-transactions.use-case.spec.ts src/me/application/use-cases/create-personal-transaction.use-case.spec.ts` — 16 tests passed before production changes
- Safety net: `npm run test:e2e -- test/personal-transactions.e2e-spec.ts` — 15 tests passed before production changes
- RED: mapper regression test failed until `accountName`, timestamps, `transactions`, and flat totals were implemented
- GREEN: targeted mapper/use-case unit tests passed — 16 tests
- GREEN: targeted personal-transactions E2E passed — 15 tests
- `npm run build` — passed with zero errors
- `npm test` — 202 unit tests passing
- `npm run test:e2e` — 105 E2E tests passing

## Remaining Tasks

None.

## Workload / PR Boundary

- Mode: Single PR
- Delivery strategy: `single-pr` with explicit `size:exception` (~900 lines)
- Chain strategy: N/A
- Boundary: Full implementation from schema to E2E tests, verify fix round, and default-account registration extension
- Estimated review budget impact: High — change is ~900 lines; exception accepted by user

## Status

23/23 tasks complete. Fix round complete. Default-account extension complete. Response contract fix complete. Ready for verify.
