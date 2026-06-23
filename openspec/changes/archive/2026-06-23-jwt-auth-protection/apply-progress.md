# Apply Progress: JWT Auth Protection

**Change**: jwt-auth-protection
**Mode**: Strict TDD
**Delivery**: single PR with maintainer-approved size exception
**Status**: 11/11 tasks complete — Ready for verify

## Completed Tasks

- [x] 1.1 Created JWT strategy, auth guard, public decorator, and unit coverage.
- [x] 1.2 Wired Passport/JWT modules, global APP_GUARD, and public auth/health routes.
- [x] 1.3 Added bearer Swagger annotations to protected controllers; `main.ts` already had bearer scheme.
- [x] 2.1 Threaded authenticated `userId` through groups controllers/use cases/specs.
- [x] 2.2 Threaded authenticated `userId` through expenses controllers/use cases/specs and scoped active-member validation by user.
- [x] 2.3 Threaded authenticated `userId` through the me summary controller/use case/spec.
- [x] 2.4 Removed runtime `DEV_USER_ID` from `src/` and made `GroupMapper.toDetailResponseDto()` receive user context.
- [x] 3.1 Added shared E2E auth helper and bearer-token setup for protected E2E suites.
- [x] 3.2 Added protected-route 401 coverage and retained authenticated 200 coverage across updated E2E suites.
- [x] 3.3 Ran final `npm run test && npm run test:e2e` successfully.
- [x] 4.1 Deleted obsolete runtime dev-user constant; seed retains `DEV_USER_ID` only.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1 | `src/auth/infrastructure/security/jwt.strategy.spec.ts`, `src/auth/infrastructure/security/jwt-auth.guard.spec.ts` | Unit | N/A (new) | ✅ Missing modules failed first | ✅ Passed | ✅ Strategy maps two payloads; guard covers public/protected | ✅ Clean |
| 1.2 | `test/groups.e2e-spec.ts`, auth/security unit specs | Unit/E2E | ✅ focused baseline 10/10 | ✅ Global guard caused protected routes to require tokens | ✅ Passed in full E2E | ✅ Public auth/health and protected groups covered | ✅ Clean |
| 1.3 | `src/**/*controller.ts` Swagger metadata via compile/unit suite | Unit | ✅ full unit suite | ✅ Protected controllers lacked bearer metadata before change | ✅ Passed | ➖ Structural Swagger annotations | ✅ Clean |
| 2.1 | `src/groups/application/use-cases/*.spec.ts` | Unit | ✅ focused baseline 10/10 | ✅ Old dev-user expectations failed after signature change | ✅ 18 group use-case tests passed | ✅ create/list/detail/update/archive/balances/settlements/payment | ✅ Clean |
| 2.2 | `src/expenses/application/use-cases/*.spec.ts`, `test/expenses.e2e-spec.ts` | Unit/E2E | ✅ focused baseline 10/10 | ✅ Old signatures and unscoped active-member lookup failed | ✅ 15 expense use-case tests + 20 E2E passed | ✅ create/list/detail/update/delete and inaccessible group cases | ✅ Clean |
| 2.3 | `src/me/application/use-cases/get-me-summary.use-case.spec.ts`, `test/me-summary.e2e-spec.ts` | Unit/E2E | ✅ focused baseline 10/10 | ✅ Old no-arg summary expectations failed | ✅ 2 unit + 5 E2E passed | ✅ empty and populated summaries | ✅ Clean |
| 2.4 | grep `src/` for `DEV_USER_ID`/hardcoded UUID | Static/Unit | ✅ full unit suite | ✅ Source grep initially found runtime references | ✅ Zero `src/` matches | ✅ mapper receives different userId in controller flow | ✅ Clean |
| 3.1 | `test/helpers/auth.helper.ts`, protected E2E suites | E2E | ✅ E2E suite before final fixes exposed protected failures | ✅ Missing bearer setup caused 401/404 regressions | ✅ E2E 76/76 passed | ✅ helper supports register/login and bearer token setup | ✅ Clean |
| 3.2 | `test/groups.e2e-spec.ts`, all protected E2E suites | E2E | ✅ E2E executable | ✅ unauthenticated groups request covered as 401 | ✅ E2E 76/76 passed | ✅ authenticated protected requests stay 200 | ✅ Clean |
| 3.3 | final verification commands | Unit/E2E | ✅ all previous cycles green | ✅ N/A final gate | ✅ `npm run test && npm run test:e2e` passed | ✅ Unit + E2E | ✅ Clean |
| 4.1 | grep `src/` and seed check | Static | ✅ full unit/e2e passed | ✅ Runtime constant existed before cleanup | ✅ Deleted runtime constant; seed retains local constant | ✅ Source zero-match + seed match | ✅ Clean |

## Test Summary

- **Total tests written/updated**: 2 new unit spec files, affected use-case specs, and protected E2E suites updated.
- **Total tests passing**: 150 unit tests + 76 E2E tests.
- **Layers used**: Unit, E2E, static source grep.
- **Approval tests**: Existing use-case and E2E suites preserved behavior while changing auth/user scoping.
- **Pure functions created**: 0.

## Verification

- ✅ `npm run test && npm run test:e2e`

## Deviations

- `main.ts` already had `addBearerAuth()`, so only protected controller `@ApiBearerAuth()` annotations were added.
- Existing protected E2E suites use a test helper to inject a valid bearer token for the seeded dev user; `registerAndLogin(app)` was also added for new helper-driven E2E flows.

## Risks

- The approved size exception was used; the diff exceeds the default 400-line review budget.
