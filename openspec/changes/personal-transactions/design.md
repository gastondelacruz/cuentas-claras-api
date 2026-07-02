# Design: personal-transactions

## Technical Approach

Extend `src/me/` (transversal area) following the same hexagonal + screaming layout used by `me-summary`. New endpoints at `api/v1/me/accounts` and `api/v1/me/personal-transactions`. Two Prisma models, one migration, no new Nest module. Global `JwtAuthGuard` + `ResponseInterceptor` continue to apply; `userId` flows from `@CurrentUser("userId")` to the use case.

## Architecture Decisions

| # | Choice | Rejected | Chosen | Why |
|---|--------|----------|--------|-----|
| 1 | Module placement | New `personal-transactions` domain alongside `me/` | Extend `src/me/` with new ports/use-cases/adapters | URL namespace is `/me/*`; the "current user" theme already lives there; single DI graph |
| 2 | Default account uniqueness | App-layer only (race-prone) | App check + DB partial unique index `WHERE is_default = TRUE AND archived_at IS NULL` (raw SQL in migration) | Defence in depth; Prisma 7 cannot model partial uniques natively |
| 3 | Category source | DB table seeded from TS | `as const` arrays in `domain/value-objects/transaction-category.vo.ts` | User decision; deploy-time evolution is acceptable for v1 |
| 4 | Timezone | Per-user preference | Server UTC for every boundary | User decision; simplest contract, no settings table |
| 5 | Cursor format | Raw UUID (expense style) | `Buffer.from(id).toString("base64url")` | Spec mandates "opaque base64"; encodes the same UUID Prisma already needs |
| 6 | Category validation | `@IsIn` in DTO | Use case owns per-type check | DTO `@IsIn` cannot express per-type allow-lists |
| 7 | Period→date range | Spread across use case + repo | Pure `resolveDateRange(period, range, now)` in `transaction-period.vo.ts` | Mirrors `me-summary-calculator`; testable in isolation |
| 8 | Default account fallback | Two query round-trips | One `findFirst({ isDefault: true, archivedAt: null })`; 0 → `PERSONAL_TX_NO_DEFAULT_ACCOUNT`; invariant-violation (2) → oldest `createdAt` | Happy path is one query; defensive tiebreak only on invariant violation |
| 9 | Totals | Repo-side `groupBy`/`aggregate` | Fetch filtered rows + pure-function calculator | Matches `me-summary`; calculator unit-testable without DB |
| 10 | Mapper/DTO split | Single fat mapper | `PersonalTransactionsMapper` + `AccountsMapper`, both static classes | One per aggregate; matches `ExpenseMapper` style |

## Data Flow

```
HTTP → MeController → Mapper.toInput → UseCase.execute
                                          │
                                          ├─→ Port (abstract) → Prisma adapter → runDatabaseOperation
                                          │                                            │
                                          │                                            └→ DatabaseException
                                          └─→ Calculator (pure) ← adapter returns rows
UseCase result → Mapper.toXResponseDto → DTO → ResponseInterceptor → { data: ... }
```

## File Changes

**Schema**: `prisma/schema.prisma` (add `Account`, `PersonalTransaction`, enums); `prisma/migrations/<ts>_add_personal_transactions_and_accounts/migration.sql` (tables + partial unique index `accounts(user_id) WHERE is_default = TRUE AND archived_at IS NULL`); `prisma/seed.ts` (one default `Account` per user).

**Domain** (`src/me/domain/`): `ports/{accounts,personal-transactions}.repository.ts` (abstract classes); `value-objects/{transaction-type,transaction-period,transaction-category,account-kind}.vo.ts` (the VOs; `transaction-period` exports `resolveDateRange`; `transaction-category` exports `categoriesFor` + `isCategoryAllowed`).

**Application** (`src/me/application/`): `use-cases/{list-my-accounts,list-personal-transactions,create-personal-transaction}.use-case.ts` + specs; `services/personal-transactions-totals.calculator.ts` + spec (pure cents-math `calculateTotals`).

**Infrastructure** (`src/me/infrastructure/`): `persistence/{prisma-accounts,prisma-personal-transactions}.repository.ts` (extend ports, wrap calls in `runDatabaseOperation`); `http/dto/` (5 DTOs); `http/mappers/{personal-transactions,accounts}.mapper.ts` (static mappers, base64url cursor).

**HTTP/Module**: `me.controller.ts` (add `GET /accounts`, `GET /personal-transactions`, `POST /personal-transactions`); `me.module.ts` (register 3 use cases, 2 adapters, 2 `useExisting` bindings).

**Tests**: `test/{personal-transactions,accounts}.e2e-spec.ts` (isolation, cursor stability, default-account race, period boundaries).

## Interfaces / Contracts

```ts
// Period boundary (UTC, pure)
export function resolveDateRange(
  period: PersonalTxPeriod,
  range: { dateFrom?: Date; dateTo?: Date },
  now: Date,
): { gte: Date; lt: Date };
// throws BusinessException("PERSONAL_TX_INVALID_PERIOD", 400) for unknown period

export type ListPersonalTransactionsInput = {
  userId: string; type?: TransactionType;
  dateRange: { gte: Date; lt: Date };
  limit: number; cursor?: string; // raw UUID (mapper decodes from base64url)
};
export type ListPersonalTransactionsOutput = {
  items: PersonalTransactionRow[]; nextCursor: string | null;
  totals: { incomeTotal: number; expenseTotal: number; total: number; currency: string };
};
```

Error codes: `PERSONAL_TX_INVALID_PERIOD` (400), `PERSONAL_TX_CATEGORY_NOT_ALLOWED` (400), `PERSONAL_TX_NO_DEFAULT_ACCOUNT` (400), `PERSONAL_TX_ACCOUNT_NOT_FOUND` (404). DB: `PERSONAL_TX_LIST_DATABASE_ERROR`, `PERSONAL_TX_CREATE_DATABASE_ERROR`, `ACCOUNTS_LIST_DATABASE_ERROR`.

## Testing Strategy

| Layer | What | How |
|-------|------|-----|
| Unit (calculator) | `resolveDateRange` per period; `calculateTotals` income/expense/net; `categoriesFor` per type | Pure specs; freeze `now`; assert exact `gte`/`lt` ISO per spec table |
| Unit (use case) | List, Create (with/without `accountId`, category rejection, missing default) | `Test.createTestingModule` + port mocks (`vi.fn`, `useValue`) — mirrors existing specs |
| Unit (mapper) | Cursor base64url round-trip, DTO→input coercion | Plain Vitest, no Nest |
| E2E | Auth, type/period/dateFrom/dateTo filters, default-account fallback, user isolation, archived exclusion, same-`occurredAt` cursor stability, validation 400 | `Testcontainers` + `PrismaPg` + `DEV_USER_ID` + second user via `registerAndLogin` helper |

## Migration / Rollout

Single Prisma migration: `accounts` first, `personal_transactions` second (FK); partial unique index added in the same migration via raw SQL. Rollback: `prisma migrate resolve --rolled-back` then revert code — no data to recover (tables are new). Seed creates one default `Account` per user so dev matches the invariant out of the box.

## Open Questions

None — every fork in the proposal was resolved by the user (account model in scope, hardcoded categories, UTC timezone, single-PR delivery). All other items (account CRUD, transfers, recurring, DB-backed categories, multi-currency) are explicit Out-of-Scope.
