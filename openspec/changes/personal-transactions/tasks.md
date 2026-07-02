# Tasks: Personal Transactions

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~900 (single PR, size:exception) |
| 400-line budget risk | High |
| Chained PRs recommended | No (user accepted size:exception) |
| Suggested split | N/A — single PR |
| Delivery strategy | single-pr |
| Chain strategy | N/A |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: N/A
400-line budget risk: High

## Phase 1: Schema & Migration

- [x] 1.1 Add `AccountKind` enum and `Account` model to `prisma/schema.prisma` — fields: id (uuid), userId (FK→users, cascade), name, kind (AccountKind), currency, isDefault (bool, default false), archivedAt (DateTime?), timestamps. Add `accounts Account[]` relation to `User` model. (~25 lines)
- [x] 1.2 Add `PersonalTransaction` model to `prisma/schema.prisma` — fields: id (uuid), userId (FK→users, cascade), accountId (FK→accounts, restrict), type (String), amount (Decimal 12,2), currency, category, occurredAt, note (String?), timestamps. Add `personalTransactions PersonalTransaction[]` relation to `User` and `Account`. (~20 lines)
- [x] 1.3 Create migration `prisma migrate dev` then edit the generated SQL to append raw partial unique index: `CREATE UNIQUE INDEX "accounts_user_id_default_uniq" ON "accounts"("user_id") WHERE "is_default" = TRUE AND "archived_at" IS NULL;`. Run `prisma generate`. (~15 lines SQL)
- **Files**: `prisma/schema.prisma`, `prisma/migrations/<ts>_add_accounts_and_personal_transactions/migration.sql`
- **Depends on**: nothing
- **Tests**: `npm run test:e2e -- test/prisma-schema.e2e-spec.ts` validates migration applies cleanly

## Phase 2: Domain Layer

- [x] 2.1 Create `src/me/domain/value-objects/transaction-type.vo.ts` — `TRANSACTION_TYPES = ["expense", "income"] as const`, type export, class with validation in ctor (throws `Error`). (~15 lines)
- [x] 2.2 Create `src/me/domain/value-objects/transaction-category.vo.ts` — `EXPENSE_CATEGORIES` and `INCOME_CATEGORIES` as `const` arrays, `isValidCategoryForType(type, category)` pure function. (~25 lines)
- [x] 2.3 Create `src/me/domain/value-objects/transaction-period.vo.ts` — `TRANSACTION_PERIODS = ["day","week","month","year"] as const`, type export. (~10 lines)
- [x] 2.4 Create `src/me/domain/value-objects/account-kind.vo.ts` — `ACCOUNT_KINDS = ["cash","bank","credit"] as const`, type export. (~10 lines)
- [x] 2.5 Create `src/me/domain/ports/accounts.repository.ts` — abstract class `AccountsRepository` with `findByUserId(userId)`, `findDefaultByUserId(userId)`, `findByIdAndUserId(id, userId)`. Define `Account` domain type. (~30 lines)
- [x] 2.6 Create `src/me/domain/ports/personal-transactions.repository.ts` — abstract class `PersonalTransactionsRepository` with `findFiltered(userId, filters)`, `create(data)`. Define `PersonalTransaction`, `PersonalTransactionFilters`, `CreatePersonalTransactionInput` types. (~45 lines)
- **Files**: 4 VO files + 2 port files
- **Depends on**: Phase 1 (schema for type reference only; domain is pure)
- **Tests**: Unit tests for VO constructors (invalid values throw `Error`)

## Phase 3: Application Layer (TDD — tests first)

- [x] 3.1 Create `src/me/application/services/resolve-date-range.ts` + spec — pure function `resolveDateRange(period?, dateFrom?, dateTo?)` returning `{ dateFrom: Date, dateTo: Date }` in UTC. Test: day/week/month/year boundaries, explicit dateFrom/dateTo override, invalid period throws. (~60 lines impl + ~80 lines test)
- [x] 3.2 Create `src/me/application/services/personal-transactions-totals.calculator.ts` + spec — pure function `calculatePersonalTransactionsTotals(transactions)` returning `{ incomeTotal, expenseTotal, total }`. Use cents-based math. Test: mixed types, empty set, filtered subset. (~40 lines impl + ~60 lines test)
- [x] 3.3 Create `src/me/application/use-cases/list-my-accounts.use-case.ts` + spec — injects `AccountsRepository`, returns non-archived accounts for userId. Test: returns only user's accounts, excludes archived. (~30 lines impl + ~40 lines test)
- [x] 3.4 Create `src/me/application/use-cases/list-personal-transactions.use-case.ts` + spec — injects `PersonalTransactionsRepository`, resolves date range, fetches filtered, computes totals, handles cursor pagination (take limit+1, encode nextCursor as base64url). Test: filter by type, period, cursor stability, totals match filtered set. (~70 lines impl + ~100 lines test)
- [x] 3.5 Create `src/me/application/use-cases/create-personal-transaction.use-case.ts` + spec — validates category for type, resolves default account when accountId omitted, checks account exists+belongs to user, creates transaction. Test: default account fallback, category mismatch → `PERSONAL_TX_CATEGORY_NOT_ALLOWED`, account not found → `PERSONAL_TX_ACCOUNT_NOT_FOUND`, no default → `PERSONAL_TX_NO_DEFAULT_ACCOUNT`, negative amount rejected. (~80 lines impl + ~120 lines test)
- **Files**: 2 services + 3 use cases + 5 spec files
- **Depends on**: Phase 2 (ports, VOs)
- **Error codes**: `PERSONAL_TX_INVALID_PERIOD`, `PERSONAL_TX_CATEGORY_NOT_ALLOWED`, `PERSONAL_TX_NO_DEFAULT_ACCOUNT`, `PERSONAL_TX_ACCOUNT_NOT_FOUND`

## Phase 4: Infrastructure Layer

- [x] 4.1 Create `src/me/infrastructure/persistence/prisma-accounts.repository.ts` — extends `AccountsRepository`, wraps calls in `runDatabaseOperation`. Implements `findByUserId` (exclude archived), `findDefaultByUserId` (isDefault=true, archivedAt=null), `findByIdAndUserId`. (~60 lines)
- [x] 4.2 Create `src/me/infrastructure/persistence/prisma-personal-transactions.repository.ts` — extends `PersonalTransactionsRepository`, implements `findFiltered` (cursor pagination: take limit+1, orderBy occurredAt DESC + id DESC, cursor encoding), `create`. Maps Decimal→number. (~90 lines)
- **Files**: 2 adapter files
- **Depends on**: Phase 2 (ports), Phase 1 (Prisma client generated)
- **Error codes**: `ACCOUNTS_LIST_DATABASE_ERROR`, `PERSONAL_TX_LIST_DATABASE_ERROR`, `PERSONAL_TX_CREATE_DATABASE_ERROR`

## Phase 5: HTTP Layer

- [x] 5.1 Create DTOs in `src/me/infrastructure/http/dto/`:
  - `list-personal-transactions-query.dto.ts` — `@Type(()=>Number) @IsInt() @Min(1) @Max(100) limit`, `@IsOptional() @IsIn(TRANSACTION_PERIODS) period`, `@IsOptional() @IsIn(TRANSACTION_TYPES) type`, `@IsOptional() cursor`, `@IsOptional() @IsISO8601() dateFrom/dateTo`. (~35 lines)
  - `list-personal-transactions-response.dto.ts` — items array + `nextCursor` + totals object. (~25 lines)
  - `create-personal-transaction-request.dto.ts` — `@IsPositive() @IsNumber() amount`, `@IsIn(TRANSACTION_TYPES) type`, `@IsString() category`, `@IsISO8601() occurredAt`, `@IsOptional() @IsString() note`, `@IsOptional() @IsUuid() accountId`. (~30 lines)
  - `create-personal-transaction-response.dto.ts` — single transaction shape. (~20 lines)
  - `list-accounts-response.dto.ts` — accounts array. (~15 lines)
- [x] 5.2 Create `src/me/infrastructure/http/mappers/personal-transactions.mapper.ts` — static methods: `toResponseDto`, `toResponseListDto`, `encodeCursor(id)`, `decodeCursor(cursor)`. (~40 lines)
- [x] 5.3 Create `src/me/infrastructure/http/mappers/accounts.mapper.ts` — static method: `toResponseDto`, `toResponseListDto`. (~20 lines)
- [x] 5.4 Modify `src/me/infrastructure/http/me.controller.ts` — add 3 routes: `GET /personal-transactions`, `POST /personal-transactions`, `GET /accounts`. Inject new use cases. Use `@Query()`, `@Body()`, `@CurrentUser("userId")`. Map via mappers. (~60 lines added)

## Phase 6: Module Wiring

- [x] 6.1 Modify `src/me/me.module.ts` — register `ListMyAccountsUseCase`, `ListPersonalTransactionsUseCase`, `CreatePersonalTransactionUseCase` as providers. Bind `AccountsRepository → PrismaAccountsRepository` and `PersonalTransactionsRepository → PrismaPersonalTransactionsRepository` via `useExisting`. (~20 lines added)
- **Files**: `src/me/me.module.ts`
- **Depends on**: Phase 4 (adapters), Phase 3 (use cases)

## Phase 7: E2E Tests

- [x] 7.1 Create `test/personal-transactions.e2e-spec.ts` — Test: list with filters (type, period, dateFrom/dateTo), cursor pagination (first page, next page, same-timestamp stability), totals correctness, create with default account fallback, create with explicit accountId, create with invalid category → 400, create with non-existent account → 404, unauthorized → 401. (~100 lines)
- [x] 7.2 Create `test/accounts.e2e-spec.ts` — Test: list returns only authenticated user's non-archived accounts, user isolation (user A vs user B), empty list for new user. (~40 lines)
- **Files**: 2 e2e spec files
- **Depends on**: Phase 6 (full wiring)
- **Run**: `npm run test:e2e`

## Implementation Order

Phase 1 → 2 → 3 → 4 → 5 → 6 → 7. Each phase builds on the previous. Within Phase 3, TDD discipline: write failing spec first, then implement minimum to pass, then refactor. Phases 4-6 are mechanical wiring once the application layer is green. Phase 7 validates the full HTTP→DB→response contract.
