# Pull Request

## Summary

<!-- What changed and why? Keep this focused on one logical change. -->

## OpenSpec change

- Change path: `openspec/changes/<change-name>/`
- Proposal/design/tasks updated: [ ]

## Acceptance criteria

<!-- Link the criteria from proposal.md or list the relevant ones. -->

- [ ]

## Verification

Commands run:

```text
pnpm run build
pnpm test
pnpm run test:e2e
pnpm run security:audit
```

- [ ] Focused tests pass
- [ ] `pnpm run build` passes
- [ ] `pnpm test` passes
- [ ] `pnpm run test:e2e` passes when HTTP, database, migration, or authentication behavior changed
- [ ] `pnpm run security:audit` passes
- [ ] `verify-report.md` updated when required

If a check was not run, explain why:

## Architecture impact

- Domains or transversal areas touched:
- Layers touched:
- New or changed ports and adapters:
- Dependency direction preserved: [ ]
- DTO/domain and Prisma/domain mappings preserved: [ ]

## Security considerations

<!-- Validation, authorization, secrets, data exposure, dependency changes, and migrations. -->

- [ ] No secrets or credentials included
- [ ] Input validation and authorization reviewed
- [ ] Dependency and migration impact reviewed
- [ ] No sensitive data is exposed in responses or logs

## Performance considerations

<!-- Query count, pagination, unbounded work, and resource impact. -->

- [ ] No known N+1 or unbounded query introduced
- [ ] Pagination and limits reviewed where applicable
- [ ] Performance impact is documented if relevant

## Rollback plan

<!-- Exact steps or reason why the change is safely reversible. -->

## Review checklist

- [ ] Correctness: behavior and edge cases reviewed
- [ ] Readability: naming, simplicity, and structure reviewed
- [ ] Architecture: boundaries and dependency direction reviewed
- [ ] Security: validation, authorization, secrets, and dependencies reviewed
- [ ] Performance: query shape and resource use reviewed
- [ ] No unrelated changes included
- [ ] Human approval obtained before merge
