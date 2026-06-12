---
name: project-architecture
description: "Trigger: architecture, hexagonal, screaming architecture, domain folder, Nest DI, Prisma adapter. Apply this repo's structural rules before changing src/."
license: Apache-2.0
metadata:
  author: "cuentas-claras-api"
  version: "1.0"
---

# Project Architecture

## Activation Contract

Use this skill before creating or refactoring code under `src/`, especially when adding a domain, moving files, wiring Nest providers, or questioning where business logic belongs.

## Hard Rules

- Organize `src/` by business domain first: `auth`, `users`, `groups`, `expenses`, `settlements`.
- Treat each domain as a hexagon with `domain/`, `application/`, `infrastructure/`, and `<domain>.module.ts`.
- Keep `domain/` pure: no imports from `@nestjs/*`, `@prisma/*`, or `class-validator`.
- Keep domain contracts in `domain/ports/` as **abstract classes**, not TypeScript interfaces, so Nest can use them as DI tokens.
- Use `<domain>.module.ts` as the composition root that binds ports to adapters.
- Preserve dependency direction: `infrastructure -> application -> domain`. Never reverse it.
- `health/` is operational infrastructure, not a business hexagon.
- `shared/`, `config/`, and `prisma/` are cross-cutting folders only.

## Decision Gates

| If you are changing... | Put it here |
|---|---|
| Business invariants, entities, value objects, domain errors | `src/<domain>/domain/` |
| Use-case orchestration | `src/<domain>/application/use-cases/` |
| HTTP controllers, DTOs, persistence adapters | `src/<domain>/infrastructure/` |
| Port-to-adapter bindings | `src/<domain>/<domain>.module.ts` |
| Reusable non-domain plumbing | `src/shared/`, `src/config/`, or `src/prisma/` |

## Execution Steps

1. Identify the business domain or cross-cutting concern.
2. Place code in the innermost valid layer.
3. Expose infrastructure through adapters; keep use cases dependent on ports.
4. Inject repositories/services through abstract port classes.
5. Verify no domain file imports framework or ORM types.

## Output Contract

When you change architecture-sensitive code, state:
- the domain or transversal area touched,
- the layer(s) added or modified,
- any new port/adapter binding,
- and whether dependency direction stayed intact.

## References

- `AGENTS.md`
- `src/`
