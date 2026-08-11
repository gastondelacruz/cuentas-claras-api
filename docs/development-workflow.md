# Development Workflow

This repository follows a gated lifecycle for non-trivial work:

```text
DEFINE → PLAN → BUILD → VERIFY → REVIEW → SHIP
```

The workflow is designed for humans and AI coding agents. OpenSpec stores the change-specific requirements and decisions; `AGENTS.md` stores the project-wide rules.

## 1. DEFINE

Create a change directory under `openspec/changes/<change-name>/` and write `proposal.md` before changing application code.

The proposal must describe:

- Objective and affected users.
- In-scope and out-of-scope behavior.
- Specific, testable success criteria.
- Commands and test strategy.
- Project boundaries: Always do, Ask first, and Never do.
- Risks, rollback, and open questions.

Get approval for the proposal before implementation. Update it when scope or acceptance criteria change.

## 2. PLAN

Add `design.md` and `tasks.md` to the same change directory.

The design should cover architecture, dependencies, data flow, affected files, risks, and rollback. The task list should contain small, ordered tasks. Every task needs:

- Acceptance criteria.
- Verification commands.
- Dependencies.
- Likely files.
- A reasonable scope, preferably no more than five files.

Prefer vertical slices over horizontal layers. Add a checkpoint after each major group of tasks. Obtain approval for the plan before coding.

## 3. BUILD

Implement one task or vertical slice at a time.

For behavior changes, follow red-green-refactor:

1. Write the closest failing unit or E2E test.
2. Confirm the test fails for the intended reason.
3. Implement the minimum change.
4. Confirm the focused test passes.
5. Refactor only while tests remain green.

Keep each increment compilable and independently revertible. Do not mix unrelated refactors, formatting, dependency upgrades, or cleanup with feature work.

For a bug fix, reproduce the issue with a regression test before changing production code. For a refactor of behavior without adequate coverage, add characterization tests first.

## 4. VERIFY

Run focused checks after each increment, then the complete applicable verification before review:

```bash
pnpm run build
pnpm test
pnpm run test:e2e
pnpm run security:audit
pnpm run verify
```

`pnpm run test:e2e` is required when HTTP, database, migrations, authentication, or persistence behavior changes. If a command cannot run locally, report the exact command, failure, and reason; do not claim verification that did not happen.

Record the final evidence in `verify-report.md`, including tests, build, security audit, migration status, known limitations, and remaining risks.

## 5. REVIEW

Before merge, review the change against five axes:

1. **Correctness** — behavior, edge cases, errors, and acceptance criteria.
2. **Readability** — naming, simplicity, structure, and unnecessary indirection.
3. **Architecture** — domain boundaries, dependency direction, mappings, and module wiring.
4. **Security** — validation, authorization, secrets, dependencies, and data exposure.
5. **Performance** — query shape, pagination, resource use, and unbounded work.

The pull request must link the relevant OpenSpec change and include test evidence, architecture impact, security considerations, and a rollback plan. Do not merge with unresolved critical findings.

## 6. SHIP

Ship only after the change has approved review and all required verification is green.

Before deployment, confirm:

- The migration and environment-variable rollout are documented.
- The release and deployment mechanism are known.
- Monitoring or health checks can detect failure.
- The rollback procedure is explicit and reversible.
- The post-deployment verification is defined.

Release Please creates releases from `main`, and production deployment is triggered by version tags. Never push, merge, open a pull request, or deploy without explicit approval.

## Commits and approvals

Use short-lived branches and Conventional Commits. Each successful increment should have one focused commit, for example:

```text
feat(auth): add registration use case
test(auth): cover duplicate email registration
feat(auth): wire registration endpoint
```

Before committing:

- Inspect the staged diff.
- Confirm no secrets are included.
- Run the relevant tests and build.
- Stage only files belonging to the increment.

The repository requires explicit human approval before modifying code and before creating commits, pushing, or opening a pull request.

## OpenSpec change layout

```text
openspec/changes/<change-name>/
├── proposal.md       # objective, scope, acceptance criteria, boundaries
├── design.md         # technical approach and architecture decisions
├── tasks.md          # ordered tasks and checkpoints
└── verify-report.md  # verification evidence and remaining risks
```

Completed changes remain available in `openspec/changes/archive/` as historical context. Do not delete archived proposals or reports; update the current change artifacts when decisions evolve.
