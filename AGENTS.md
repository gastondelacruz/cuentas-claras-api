# AGENTS.md — cuentas-claras-api

Guía operativa para agentes de IA y personas que trabajan en este repo. Leé esto **antes** de escribir código, tests o documentación.

## Quick path

1. Identificá el dominio que vas a tocar (`auth`, `users`, `groups`, `expenses`, `settlements`) o la infraestructura transversal (`shared`, `config`, `prisma`).
2. **Antes de tocar código**, revisá la sección [Skills](#skills) y leé la `SKILL.md` que corresponda a la tarea.
3. Escribí o modificá el código respetando las [convenciones](#convenciones).
4. Agregá/actualizá tests (`*.spec.ts` junto al código, `*.e2e-spec.ts` en `test/`).
5. Verificá con `npm test` (y `npm run test:e2e` si tocaste el flujo HTTP/DB).

## Reglas de interacción

| Regla | Detalle |
|-------|---------|
| Aprobación de código | Antes de agregar o modificar código, mostrá el plan o el diff y **esperá aprobación explícita**. No avances sin el OK. |
| Aprobación de commits | **Nunca** hagas `git commit` (ni `push`, ni PR) sin pedir aprobación antes. Mostrá qué se va a commitear y esperá confirmación. |
| Una cosa a la vez | Si hay varios cambios, mostralos en partes revisables, no todo junto. |

## Stack

| Capa | Tecnología |
|------|------------|
| Runtime | Node.js 26, TypeScript (strict) |
| Framework | NestJS 11 |
| ORM | Prisma 7 (driver adapter `@prisma/adapter-pg`) |
| Base de datos | PostgreSQL 17 (vía `docker compose`) |
| Validación | `class-validator` / `class-transformer`, `joi` para env |
| Docs API | Swagger en `/docs` |
| Testing | Vitest 4 + `unplugin-swc` + coverage v8, `supertest` para e2e |

## Arquitectura (hexagonal + screaming architecture)

La estructura de `src/` **grita el dominio del negocio**, no el framework. Las carpetas de primer nivel son dominios de negocio; cada dominio es un **hexágono**: el núcleo define puertos (interfaces) y la infraestructura los implementa (adaptadores).

```
src/
  groups/                     # dominio de negocio (igual: auth, users, expenses, settlements)
    domain/                   # núcleo puro: CERO imports de Nest/Prisma
      entities/               #   entidades y value objects
      ports/                  #   contratos: GroupRepository (driven), etc.
      errors/                 #   errores de dominio
    application/
      use-cases/              #   orquestan el dominio vía puertos
    infrastructure/
      http/                   #   adaptador de entrada: controller + DTOs
      persistence/            #   adaptador de salida: prisma-*.repository.ts
    groups.module.ts          #   composición: bindea puerto → adaptador (DI)
  health/                     # endpoint operacional, NO es dominio (sin hexágono)
  shared/                     # transversal: decorators, filters, guards, interceptors
  config/                     # transversal: configuración y validación de env
  prisma/                     # transversal: PrismaService + PrismaModule
  app.module.ts               # raíz de composición
  main.ts                     # bootstrap
```

Reglas de dependencia (lo que hace que esto sea hexagonal de verdad):

1. **`domain/` no importa NADA de framework** — ni `@nestjs/*`, ni `@prisma/*`, ni `class-validator`. Si un archivo de `domain/` importa infraestructura, está mal aunque la carpeta diga "domain".
2. **Puertos como clases abstractas** (no `interface`): las interfaces de TS se borran en runtime y Nest no puede inyectarlas. La clase abstracta es token de DI y contrato a la vez.
3. **El `*.module.ts` es el único que conoce ambos lados**: `{ provide: GroupRepository, useClass: PrismaGroupRepository }`.
4. **La dirección de dependencia es siempre hacia adentro**: `infrastructure → application → domain`. Nunca al revés.

Reglas generales:

- Un dominio nuevo es una carpeta nueva bajo `src/` con la estructura hexagonal de arriba y su `*.module.ts`.
- La lógica de negocio vive en `domain/` y `application/` del dominio, **no** en `shared/`. `shared/` es solo para piezas reutilizables sin dominio (filtros HTTP, interceptors, decorators, guards).
- El acceso a datos pasa por adaptadores de `infrastructure/persistence/` que usan `PrismaService` (inyectado), nunca instanciando `PrismaClient` a mano. Los use cases NO ven Prisma: ven el puerto.
- `config/` centraliza la lectura de env; los módulos consumen config tipada, no `process.env` directo.

## Convenciones

| Tema | Regla |
|------|-------|
| Indentación | **Tabs** (no espacios). |
| Comillas | **Dobles** en imports y strings TS. |
| Punto y coma | Sí, siempre. |
| Imports de tipos | `import { type Foo }` cuando es solo tipo. |
| Nombres de archivo | `kebab-case.<rol>.ts` (ej. `current-user.decorator.ts`, `http-exception.filter.ts`). |
| DTOs | Clases con decoradores de `class-validator`. |
| Respuestas HTTP | Forma uniforme vía `ResponseInterceptor` (`{ data: ... }`). |

## Testing

| Comando | Para qué |
|---------|----------|
| `npm test` | Corre unit tests (`src/**/*.spec.ts`) una vez. |
| `npm run test:watch` | Modo watch durante desarrollo. |
| `npm run test:cov` | Unit tests + reporte de coverage (v8) en `./coverage`. |
| `npm run test:e2e` | Tests e2e (`test/**/*.e2e-spec.ts`), serial, contra app + DB real. |

Notas clave:

- **Decoradores + Vitest**: la compilación la maneja **SWC** (`unplugin-swc`), no Oxc/esbuild. Esto es obligatorio porque NestJS depende de `emitDecoratorMetadata`. Por eso `oxc: false` en `vitest.config.ts`. No lo quites: sin SWC, `Test.createTestingModule` no resuelve las dependencias.
- Unit tests viven **junto al código** que prueban (`health.controller.spec.ts` al lado de `health.controller.ts`).
- e2e tests viven en `test/` con sufijo `.e2e-spec.ts` y usan `supertest` contra la app Nest.
- Usá `Test.createTestingModule` para armar el contexto de DI; mockeá `PrismaService` en unit tests, usá DB real en e2e.

## Documentación técnica

Para saber cómo usar una librería del stack (NestJS, Prisma, TypeScript, Vitest, Node), en este orden:

1. **El código del repo primero** — la verdad del proyecto está en el proyecto.
2. **Skills técnicas locales (`.agents/skills/`)** — referencia pineada a la versión del stack (Prisma 7.6.0, Vitest, NestJS, TS). **Primera parada** para patrones y APIs. Ver [Skills técnicas del proyecto](#skills-tecnicas-del-proyecto-agentsskills).
3. **Context7 (MCP)** — **fallback** para lo que la skill local no cubra: doc oficial viva y versionada, on-demand.
4. **Conocimiento base** — solo para patrones estables; verificá lo que cambia rápido.

Las skills técnicas locales están **versionadas con el código** y pineadas a una versión concreta. Si bumpeás una dependencia mayor, actualizá la skill correspondiente o caé a Context7 para lo nuevo — no dejes que mienta.

## Skills

Hay **dos tipos** de skills. Antes de cada tarea, identificá el contexto y leé la `SKILL.md` correspondiente **antes** de escribir código, tests, docs o commits. Pueden aplicar **varias a la vez** (ej. tocar un service de Prisma + escribir su test = `prisma-client-api` + `vitest`). Si ninguna aplica, seguí sin inyección de skills.

### Skills técnicas del proyecto (`.agents/skills/`)

Viven **dentro del repo**, versionadas con el código y pineadas a tu stack. Son la **primera fuente** de doc de librerías (antes que Context7). Si tocás el área, leé su `SKILL.md`.

**Uso diario** — el grueso del trabajo cae acá:

| Tocás… | Skill | Path |
|--------|-------|------|
| Código NestJS (módulos, DI, guards, controllers, providers) | `nestjs-best-practices` | `.agents/skills/nestjs-best-practices/SKILL.md` |
| Decisiones de arquitectura Node / async / seguridad | `nodejs-best-practices` | `.agents/skills/nodejs-best-practices/SKILL.md` |
| Queries con Prisma Client (`findMany`, `create`, `$transaction`, filtros) | `prisma-client-api` | `.agents/skills/prisma-client-api/SKILL.md` |
| Comandos Prisma CLI (`generate`, `migrate`, `db`, `studio`) | `prisma-cli` | `.agents/skills/prisma-cli/SKILL.md` |
| Tipos avanzados de TS (generics, conditional, mapped, utility) | `typescript-advanced-types` | `.agents/skills/typescript-advanced-types/SKILL.md` |
| Tests con Vitest (mocking, coverage, fixtures, filtering) | `vitest` | `.agents/skills/vitest/SKILL.md` |

**Referencia secundaria** — solo cuando la tarea lo pide explícitamente (la DB ya está configurada y el framework es NestJS):

| Tocás… | Skill | Path |
|--------|-------|------|
| Patrones de backend Node / diseño de API / middleware / errores (Express/Fastify) | `nodejs-backend-patterns` | `.agents/skills/nodejs-backend-patterns/SKILL.md` |
| Configurar Prisma con un provider / connection issues | `prisma-database-setup` | `.agents/skills/prisma-database-setup/SKILL.md` |
| Prisma Postgres (provisioning, Console, create-db) | `prisma-postgres` | `.agents/skills/prisma-postgres/SKILL.md` |

> `nodejs-backend-patterns` referencia Express/Fastify: tomá los patrones de arquitectura/API, pero el framework real acá es **NestJS** — ante conflicto, gana `nestjs-best-practices`.

### Skills de flujo de trabajo (`.atl/skill-registry.md`)

Viven **fuera del repo** (instaladas en `~/.config/opencode/skills` y rutas equivalentes). **No las copies dentro del proyecto.** El índice canónico es `.atl/skill-registry.md`:

| Contexto de la tarea | Skill a leer |
|----------------------|--------------|
| Crear/abrir/preparar un Pull Request | `branch-pr` |
| PR grande (>400 líneas) o trabajo en slices | `chained-pr` |
| Planear commits como unidades revisables | `work-unit-commits` |
| Escribir docs, READMEs, guías, onboarding | `cognitive-doc-design` |
| Comentarios en PR/issues/reviews | `comment-writer` |
| Crear issues / bug reports | `issue-creation` |
| Review adversarial / dual review | `judgment-day` |
| Crear una skill nueva | `skill-creator` |
| Auditar/mejorar skills | `skill-improver` |

Protocolo:

1. Mirá la columna `Trigger / description` en `.atl/skill-registry.md`.
2. Abrí la `SKILL.md` exacta de la ruta indicada **antes** de empezar a trabajar.
3. Si ninguna skill aplica, seguí sin inyección de skills.

Si agregás, quitás o cambiás skills de flujo, regenerá el índice:

```bash
gentle-ai skill-registry refresh --force
```

## Checklist antes de entregar

- [ ] Leíste la(s) skill(s) relevante(s): técnicas (`.agents/skills/`) y/o de flujo (`.atl/skill-registry.md`).
- [ ] El código respeta la arquitectura hexagonal (dominio correcto, `domain/` sin imports de framework, dependencias hacia adentro, lógica fuera de `shared/`).
- [ ] Tabs, comillas dobles, nombres `kebab-case.<rol>.ts`.
- [ ] Hay tests nuevos/actualizados y `npm test` pasa.
- [ ] Si tocaste HTTP/DB, `npm run test:e2e` pasa.
- [ ] No hay secretos commiteados (`.env` está en `.gitignore`).
