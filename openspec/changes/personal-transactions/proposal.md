# Proposal: Personal Transactions

## Intent

Users need to track personal income and expenses outside group contexts. Today the app only supports group-scoped expenses; there is no way to record, filter, or summarize individual financial activity. This change adds personal transaction management with account support, date-range filtering, and running totals.

## Scope

### In Scope
- `Account` Prisma model (kind, currency, isDefault, archivedAt)
- `PersonalTransaction` Prisma model (type, amount, currency, category, occurredAt, note)
- `GET /api/v1/me/personal-transactions` — list with type/date-range filtering, cursor pagination, totals
- `POST /api/v1/me/personal-transactions` — create with default account resolution
- `GET /api/v1/me/accounts` — list user accounts
- Hardcoded category allow-lists per transaction type (`as const` arrays)
- UTC timezone for all day/week/month/year boundary calculations
- Cursor-based pagination (opaque base64), ordered by occurredAt DESC

### Out of Scope
- Account CRUD (create/update/archive accounts) — deferred
- Transfers between accounts
- Recurring transactions
- Category management UI or DB-backed categories
- Multi-currency conversion

## Capabilities

### New Capabilities
- `personal-transactions`: Create and list personal income/expense transactions with filtering, cursor pagination, and aggregated totals (incomeTotal, expenseTotal, net total)
- `accounts`: User financial accounts with default account resolution for transaction creation

### Modified Capabilities
None

## Approach

Extend the existing `me/` module following established hexagonal patterns:

- **Domain layer**: Value objects for transaction type, period (with `resolveDateRange` helper), category (per-type allow-lists), and account kind — all as `as const` arrays
- **Application layer**: Three use cases (`listMyAccounts`, `listPersonalTransactions`, `createPersonalTransaction`) + pure-function totals calculator
- **Infrastructure layer**: Prisma adapters implementing abstract port classes, HTTP DTOs with class-validator, mappers for entity-to-DTO conversion
- **Module wiring**: Register new ports/adapters/use-cases in `me.module.ts` via `useExisting`
- **Auth**: All endpoints use existing global `JwtAuthGuard`; extract `userId` via `@CurrentUser("userId")`
- **Default account**: When `accountId` omitted on create, resolve user's default non-archived account; throw `PERSONAL_TX_NO_DEFAULT_ACCOUNT` if none

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modified | Add Account and PersonalTransaction models + migration |
| `src/me/domain/` | New | Ports, value objects (type, period, category, account-kind) |
| `src/me/application/use-cases/` | New | 3 use cases + specs |
| `src/me/application/services/` | New | Totals calculator (pure functions) |
| `src/me/infrastructure/persistence/` | New | 2 Prisma adapters |
| `src/me/infrastructure/http/dto/` | New | Query, request, response DTOs |
| `src/me/infrastructure/http/mappers/` | New | Transaction + account mappers |
| `src/me/infrastructure/http/me.controller.ts` | Modified | 3 new routes |
| `src/me/me.module.ts` | Modified | Register new providers |
| `test/personal-transactions.e2e-spec.ts` | New | E2E coverage |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Single PR exceeds 400-line review budget (~900 lines) | High | User accepted `size:exception`; sdd-tasks must define clear task ordering |
| Default account race on parallel POSTs | Low | Use Prisma `$transaction`; document "first non-archived account" semantics |
| Category allow-list requires deploy to change | Low | Acceptable for v1; flag for future DB-backed categories |
| Auth scoping leak on accounts list | Low | E2E test: second user cannot see first user's accounts |

## Rollback Plan

1. Revert the Prisma migration (`prisma migrate resolve --rolled-back`)
2. Revert code changes — all new code lives in `src/me/` additions; no existing behavior modified
3. No data migration needed — tables are new, existing data untouched

## Dependencies

- Prisma migration must create `accounts` table before `personal_transactions` (FK constraint)

## Success Criteria

- [ ] All three endpoints return correct responses per specification
- [ ] Cursor pagination returns stable ordering with correct `nextCursor`
- [ ] Totals (income, expense, net) match filtered transaction set
- [ ] Default account resolution works when `accountId` omitted
- [ ] Category validation rejects unknown categories per transaction type
- [ ] `npm test` and `npm run test:e2e` pass
- [ ] Second user cannot access first user's accounts or transactions
