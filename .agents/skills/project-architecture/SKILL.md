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
- Keep HTTP DTOs, request/response DTOs, and HTTP mappers in `infrastructure/http/` only.
- Use cases must not import HTTP DTOs, controllers, HTTP mappers, Prisma types, or Nest HTTP exceptions.
- Use cases receive and return domain/application types. Controllers map HTTP DTOs to domain/application input and map use-case results to response DTOs.
- Prisma adapters live in `infrastructure/persistence/`, implement domain ports, and return domain/application types instead of Prisma records.
- Wrap database calls in persistence adapters and translate raw DB/Prisma failures into `DatabaseException` with safe messages.
- Business and application errors must use `BusinessException` with stable error codes. Do not throw Nest HTTP exceptions from use cases or domain code.
- Successful HTTP responses are wrapped by `ResponseInterceptor` as `{ data: ... }`; error responses are normalized by the global exception filter as `{ error: { code, message, type, statusCode, path, timestamp } }`.
- `health/` is operational infrastructure, not a business hexagon.
- `shared/`, `config/`, and `prisma/` are cross-cutting folders only.

## Decision Gates

| If you are changing... | Put it here |
|---|---|
| Business invariants, entities, value objects, domain errors | `src/<domain>/domain/` |
| Repository/service contracts used as DI tokens | `src/<domain>/domain/ports/` |
| Use-case orchestration | `src/<domain>/application/use-cases/` |
| HTTP controllers, request/response DTOs, HTTP mappers | `src/<domain>/infrastructure/http/` |
| Prisma/database adapters | `src/<domain>/infrastructure/persistence/` |
| Port-to-adapter bindings | `src/<domain>/<domain>.module.ts` |
| Cross-cutting exceptions, filters, interceptors, decorators | `src/shared/` |
| Environment and Prisma bootstrapping | `src/config/` or `src/prisma/` |

## Boundary Examples

### HTTP create/update flow

```text
Controller -> HTTP mapper -> UseCase -> Domain port -> Prisma adapter
                 ^              |            |             |
                 |              |            |             v
Response DTO <- HTTP mapper <- Domain result <- Domain entity <- Prisma record
```

Rules:

- The controller owns HTTP concerns: decorators, pipes, request DTOs, response DTOs, and HTTP mappers.
- The use case owns orchestration only. It receives domain/application input and returns domain/application output.
- The repository port is an abstract class in `domain/ports/`.
- The Prisma adapter maps between Prisma records and domain/application types.

### Error flow

```text
Domain/Application error -> BusinessException -> Global exception filter -> { error: ... }
Prisma/DB error          -> DatabaseException -> Global exception filter -> { error: ... }
Validation error         -> HttpException     -> Global exception filter -> { error: ... }
```

Rules:

- Use stable error codes such as `GROUP_NOT_FOUND`.
- Do not leak raw Prisma/database error messages to HTTP responses.
- Do not wrap successful responses manually in controllers; `ResponseInterceptor` owns `{ data: ... }`.

## Execution Steps

1. Identify the business domain or cross-cutting concern.
2. Place code in the innermost valid layer.
3. Expose infrastructure through adapters; keep use cases dependent on ports.
4. Inject repositories/services through abstract port classes.
5. Keep DTO/domain conversion at the HTTP boundary.
6. Keep Prisma/domain conversion inside persistence adapters.
7. Verify no domain file imports framework or ORM types.
8. Verify no use case imports HTTP DTOs, HTTP mappers, Prisma types, or Nest HTTP exceptions.

## Output Contract

When you change architecture-sensitive code, state:
- the domain or transversal area touched,
- the layer(s) added or modified,
- any new port/adapter binding,
- whether dependency direction stayed intact,
- where DTO/domain and Prisma/domain mapping happens,
- and which business/database exception codes were introduced or changed.

## References

- `AGENTS.md`
- `src/`
