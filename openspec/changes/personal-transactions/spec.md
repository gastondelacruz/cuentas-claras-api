# Delta Spec: personal-transactions

## ADDED Requirements

### Requirement: Account model
Account MUST persist per user with id, userId (FK users, cascade), name, kind, currency, isDefault, archivedAt, timestamps. One non-archived account per user MAY be default. Archived accounts MUST be excluded from listings and default resolution.

#### Scenario: Default account resolution
- GIVEN a user has one non-archived default account
- WHEN creating a transaction without accountId
- THEN the system uses that account

#### Scenario: No default account
- GIVEN a user has no non-archived default account
- WHEN creating a transaction without accountId
- THEN the system returns 400 PERSONAL_TX_NO_DEFAULT_ACCOUNT

### Requirement: PersonalTransaction model
PersonalTransaction MUST persist with id, userId (FK users, cascade), accountId (FK accounts, restrict), type (expense|income), amount positive Decimal(12,2), currency ISO 4217, category, occurredAt, optional note, timestamps.

### Requirement: Category validation
Category MUST belong to the allow-list for the transaction type. Expense: Salud, Ocio, Departament, Café, Educación, Regalos, Alimentación. Income: Salario, Regalos, Intereses, Otros.

#### Scenario: Valid category
- GIVEN type=expense and category=Salud
- WHEN creating a transaction
- THEN the transaction is accepted

#### Scenario: Category not allowed for type
- GIVEN type=expense and category=Salario
- WHEN creating a transaction
- THEN the system returns 400 PERSONAL_TX_CATEGORY_NOT_ALLOWED

### Requirement: Date range calculation
The system MUST compute UTC boundaries for day, week, month, year. period MUST accept explicit dateFrom/dateTo.

| Period | Start | End |
|--------|-------|-----|
| day | today 00:00 UTC | tomorrow 00:00 UTC |
| week | Monday 00:00 UTC | next Monday 00:00 UTC |
| month | 1st day 00:00 UTC | 1st of next month 00:00 UTC |
| year | Jan 1 00:00 UTC | next Jan 1 00:00 UTC |

#### Scenario: Week range
- GIVEN period=week and now is Monday 2026-06-29T12:00:00Z
- WHEN listing transactions
- THEN filter gte=2026-06-29T00:00:00Z and lt=2026-07-06T00:00:00Z

#### Scenario: Invalid period
- GIVEN period=quarter
- WHEN listing transactions
- THEN the system returns 400 PERSONAL_TX_INVALID_PERIOD

### Requirement: Cursor pagination
Transactions MUST order by occurredAt DESC, id DESC and return an opaque base64 nextCursor.

#### Scenario: First page
- GIVEN 15 transactions
- WHEN requesting limit=10 with no cursor
- THEN 10 items and a nextCursor are returned

#### Scenario: Same-timestamp stability
- GIVEN two transactions with identical occurredAt
- WHEN paginating with a cursor
- THEN ordering remains stable across pages

### Requirement: Totals calculation
The response MUST include incomeTotal, expenseTotal, and total = incomeTotal - expenseTotal for the filtered set. Currency is ARS for now.

#### Scenario: Filtered totals
- GIVEN 3 income and 2 expense transactions match the filter
- WHEN listing transactions
- THEN totals include only those 5 transactions

### Requirement: List personal transactions
GET /api/v1/me/personal-transactions MUST require authentication and support type, period, dateFrom, dateTo filters.

#### Scenario: Filter by type
- GIVEN the user has income and expense transactions
- WHEN requesting type=expense
- THEN only expense transactions are returned

#### Scenario: Unauthorized
- GIVEN no valid JWT
- WHEN calling the endpoint
- THEN 401 is returned

### Requirement: Create personal transaction
POST /api/v1/me/personal-transactions MUST validate input, resolve default account when accountId is omitted, and reject non-existent accounts.

#### Scenario: Default account fallback
- GIVEN the user has a default account
- WHEN creating a transaction without accountId
- THEN the transaction links to the default account

#### Scenario: Validation failure
- GIVEN amount=-10
- WHEN creating a transaction
- THEN 400 validation error is returned

#### Scenario: Account not found
- GIVEN accountId does not exist or belongs to another user
- WHEN creating a transaction
- THEN 404 PERSONAL_TX_ACCOUNT_NOT_FOUND is returned

### Requirement: List accounts
GET /api/v1/me/accounts MUST return only the authenticated user's non-archived accounts.

#### Scenario: User isolation
- GIVEN user A and user B each have accounts
- WHEN user A lists accounts
- THEN only user A's accounts are returned
