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

## Arquitectura (screaming architecture)

La estructura de `src/` **grita el dominio del negocio**, no el framework. Las carpetas de primer nivel son dominios de negocio; la infraestructura transversal es explícita y está separada.

```
src/
  auth/          # dominio: autenticación
  users/         # dominio: usuarios
  groups/        # dominio: grupos
  expenses/      # dominio: gastos
  settlements/   # dominio: liquidaciones
  shared/        # transversal: decorators, filters, guards, interceptors
  config/        # transversal: configuración y validación de env
  prisma/        # transversal: PrismaService + PrismaModule
  app.module.ts  # raíz de composición
  main.ts        # bootstrap
```

Reglas:

- Un dominio nuevo es una carpeta nueva bajo `src/`, con su propio `*.module.ts`, `*.controller.ts`, `*.service.ts` y DTOs.
- La lógica de negocio vive en el dominio, **no** en `shared/`. `shared/` es solo para piezas reutilizables sin dominio (filtros HTTP, interceptors, decorators, guards).
- El acceso a datos pasa por `PrismaService` (inyectado), nunca instanciando `PrismaClient` a mano.
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

Para saber cómo usar una librería (NestJS, Prisma, TypeScript, Vitest, etc.):

1. **El código del repo primero** — la verdad del proyecto está en el proyecto.
2. **Context7 (MCP)** — doc oficial viva y versionada, on-demand.
3. **Conocimiento base** — solo para patrones estables; verificá lo que cambia rápido.

**No** crear skills con doc de librerías: envejecen y mienten. Las skills son solo para **convenciones de este proyecto** (ver tabla de [Skills](#skills)).

## Skills

Las skills son instrucciones especializadas que viven **fuera del repo** (instaladas por usuario en `~/.config/opencode/skills` y rutas equivalentes). **No las copies dentro del proyecto.** El índice canónico es:

```
.atl/skill-registry.md
```

Antes de cualquier tarea, identificá el contexto y leé la `SKILL.md` correspondiente desde la ruta que figura en el registry:

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

Si agregás, quitás o cambiás skills, regenerá el índice:

```bash
gentle-ai skill-registry refresh --force
```

## Checklist antes de entregar

- [ ] Leíste la(s) skill(s) relevante(s) del registry.
- [ ] El código respeta screaming architecture (dominio correcto, lógica fuera de `shared/`).
- [ ] Tabs, comillas dobles, nombres `kebab-case.<rol>.ts`.
- [ ] Hay tests nuevos/actualizados y `npm test` pasa.
- [ ] Si tocaste HTTP/DB, `npm run test:e2e` pasa.
- [ ] No hay secretos commiteados (`.env` está en `.gitignore`).
