# Design: Auth Registration

## Technical Approach

Add a self-contained `src/auth/` hexagon for email/password registration. The design follows current `groups`/`me` patterns: domain ports are abstract classes, use cases depend only on ports, Prisma/JWT/argon2 live in infrastructure, controllers map through an HTTP mapper, successful responses are wrapped by `ResponseInterceptor`, and application errors use `BusinessException`. Existing `DEV_USER_ID` behavior remains unchanged.

## Architecture Decisions

| Decision | Choice | Tradeoff / Alternative | Rationale |
|---|---|---|---|
| Module shape | Full hexagonal `auth` module | More files than a thin `AuthService` | Matches repo architecture and keeps auth testable. |
| Password storage | `argon2.hash()` / `argon2.verify()` behind `PasswordHasher` | Native addon risk | Argon2 is stronger than bcrypt; port isolates fallback to `@node-rs/argon2` if Docker/native builds fail. |
| Token signing | `@nestjs/jwt` `JwtService` behind `TokenService` | Manual `jsonwebtoken` usage | Nest-native, injectable, and secrets/TTLs stay config-driven. |
| Refresh persistence | Store only hashed refresh tokens | Raw token storage | Prevents database token disclosure from becoming session disclosure. |
| Config ownership | `ConfigModule.forFeature(authConfig)` inside `AuthModule` | Global env reads | Feature owns its config; Joi still validates env at app startup. |

## Exact File Tree

```text
src/auth/
├── auth.module.ts
├── domain/
│   └── ports/
│       ├── auth-user.repository.ts
│       ├── password-hasher.ts
│       ├── refresh-token.repository.ts
│       └── token.service.ts
├── application/
│   └── use-cases/
│       ├── register.use-case.ts
│       └── register.use-case.spec.ts
└── infrastructure/
    ├── security/
    │   ├── argon2-password-hasher.ts
    │   └── jwt-token.service.ts
    ├── persistence/
    │   ├── prisma-auth-user.repository.ts
    │   └── prisma-refresh-token.repository.ts
    └── http/
        ├── auth.controller.ts
        ├── dto/
        │   ├── register-request.dto.ts
        │   └── register-response.dto.ts
        └── mappers/
            └── auth.mapper.ts
```

Other changed files: `src/app.module.ts`, `src/config/auth.config.ts`, `src/config/env.validation.ts`, `prisma/schema.prisma`, `prisma/migrations/<timestamp>_add_auth_registration/migration.sql`, `.env.example`, `package.json`, `test/auth.e2e-spec.ts`.

## Module Wiring

```ts
@Module({
	imports: [ConfigModule.forFeature(authConfig), JwtModule.register({})],
	controllers: [AuthController],
	providers: [
		RegisterUseCase,
		Argon2PasswordHasher,
		JwtTokenService,
		PrismaAuthUserRepository,
		PrismaRefreshTokenRepository,
		{ provide: PasswordHasher, useExisting: Argon2PasswordHasher },
		{ provide: TokenService, useExisting: JwtTokenService },
		{ provide: AuthUserRepository, useExisting: PrismaAuthUserRepository },
		{ provide: RefreshTokenRepository, useExisting: PrismaRefreshTokenRepository },
	],
	exports: [],
})
export class AuthModule {}
```

`PrismaModule` is already `@Global()` and imported once by `AppModule`, matching existing modules. `AppModule` adds `AuthModule` to `imports`; `ConfigModule.forRoot({ load: [appConfig], validationSchema })` remains the root validator, while auth config is loaded by `AuthModule` through `forFeature`.

## Prisma Schema Design

```prisma
model User {
  id            String         @id @default(uuid()) @db.Uuid
  name          String
  email         String         @unique
  avatarUrl     String?        @map("avatar_url")
  passwordHash  String?        @map("password_hash")
  googleId      String?        @unique @map("google_id")
  createdAt     DateTime       @default(now()) @map("created_at")
  updatedAt     DateTime       @updatedAt @map("updated_at")
  ownedGroups   Group[]        @relation("GroupOwner")
  groupMembers  GroupMember[]
  refreshTokens RefreshToken[]

  @@map("users")
}

model RefreshToken {
  id        String    @id @default(uuid()) @db.Uuid
  userId    String    @map("user_id") @db.Uuid
  tokenHash String    @map("token_hash")
  expiresAt DateTime  @map("expires_at")
  revokedAt DateTime? @map("revoked_at")
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade, onUpdate: Cascade)

  @@index([userId])
  @@index([expiresAt])
  @@map("refresh_tokens")
}
```

Migration convention: run `npm run prisma:migrate -- --name add_auth_registration`, producing `prisma/migrations/<YYYYMMDDHHMMSS>_add_auth_registration/migration.sql`. The migration is additive: nullable user fields plus a new table.

## Config Design

```ts
export interface AuthConfig {
	jwtAccessSecret: string;
	jwtRefreshSecret: string;
	jwtAccessTtl: string;
	jwtRefreshTtl: string;
	googleClientId?: string;
}

export default registerAs("auth", (): AuthConfig => ({
	jwtAccessSecret: process.env.JWT_ACCESS_SECRET!,
	jwtRefreshSecret: process.env.JWT_REFRESH_SECRET!,
	jwtAccessTtl: process.env.JWT_ACCESS_TTL ?? "15m",
	jwtRefreshTtl: process.env.JWT_REFRESH_TTL ?? "30d",
	googleClientId: process.env.GOOGLE_CLIENT_ID,
}));
```

`env.validation.ts` additions: `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are required strings with `.min(32)` outside `NODE_ENV="test"`; in test they receive deterministic 32+ char defaults so existing E2E suites that compile `AppModule` do not break. `JWT_ACCESS_TTL` defaults to `"15m"`; `JWT_REFRESH_TTL` defaults to `"30d"`; both should match `/^\d+[smhd]$/`. `GOOGLE_CLIENT_ID` is optional. `.env.example` documents all five keys.

## Ports and Adapters

```ts
export type AuthUser = { id: string; name: string; email: string };
export type CreateUserWithPasswordInput = { name: string; email: string; passwordHash: string };
export abstract class AuthUserRepository {
	abstract findByEmail(email: string): Promise<AuthUser | null>;
	abstract createWithPassword(input: CreateUserWithPasswordInput): Promise<AuthUser>;
}

export abstract class PasswordHasher {
	abstract hash(plain: string): Promise<string>;
	abstract verify(hash: string, plain: string): Promise<boolean>;
}

export type SaveRefreshTokenInput = { userId: string; tokenHash: string; expiresAt: Date };
export abstract class RefreshTokenRepository {
	abstract save(input: SaveRefreshTokenInput): Promise<void>;
}

export type AccessTokenPayload = { sub: string; email: string };
export type RefreshTokenPayload = { sub: string };
export type SignedRefreshToken = { token: string; expiresAt: Date };
export abstract class TokenService {
	abstract signAccessToken(payload: AccessTokenPayload): Promise<string>;
	abstract signRefreshToken(payload: RefreshTokenPayload): Promise<SignedRefreshToken>;
}
```

`Argon2PasswordHasher` calls `argon2.hash(plain)` and `argon2.verify(hash, plain)`. `verify` returns `false` for invalid/mismatched hashes; `hash` failures bubble as unexpected infrastructure failures. If native addon builds fail, replace implementation with `@node-rs/argon2` without changing the port. `JwtTokenService` injects `JwtService` and `ConfigService`, calls `signAsync(payload, { secret, expiresIn })`, and computes refresh `expiresAt` by parsing `auth.jwtRefreshTtl` (`s/m/h/d`). Prisma repositories select only `{ id, name, email }`, never return `passwordHash`, and wrap Prisma calls in `DatabaseException` codes: `AUTH_USER_FIND_DATABASE_ERROR`, `AUTH_USER_CREATE_DATABASE_ERROR`, `REFRESH_TOKEN_SAVE_DATABASE_ERROR`.

## RegisterUseCase

Flow: `findByEmail` → if found throw `new BusinessException("EMAIL_ALREADY_EXISTS", "Email already registered.", 409)` → hash password → `createWithPassword` → sign access token + refresh token → hash raw refresh token → save refresh token with `expiresAt` → return.

```ts
export type RegisterInput = { name: string; email: string; password: string };
export type RegisterResult = { accessToken: string; refreshToken: string; user: AuthUser };

async execute(input: RegisterInput): Promise<RegisterResult> {
	const existing = await this.users.findByEmail(input.email);
	if (existing) throw new BusinessException("EMAIL_ALREADY_EXISTS", "Email already registered.", 409);

	const passwordHash = await this.hasher.hash(input.password);
	const user = await this.users.createWithPassword({ name: input.name, email: input.email, passwordHash });
	const accessToken = await this.tokens.signAccessToken({ sub: user.id, email: user.email });
	const refresh = await this.tokens.signRefreshToken({ sub: user.id });
	const tokenHash = await this.hasher.hash(refresh.token);
	await this.refreshTokens.save({ userId: user.id, tokenHash, expiresAt: refresh.expiresAt });

	return { accessToken, refreshToken: refresh.token, user };
}
```

## HTTP Layer

`RegisterRequestDto`: `email` uses `@ApiProperty()`, `@IsEmail()`, and trims/lowercases with `@Transform`; `password` uses `@ApiProperty()`, `@IsString()`, `@MinLength(8)`; `name` uses `@ApiProperty()`, `@IsString()`, `@IsNotEmpty()`, and trim transform.

`AuthController`: `@ApiTags("auth")`, `@Controller("api/v1/auth")`, `@Post("register")`, method `async register(@Body() body: RegisterRequestDto): Promise<RegisterResponseDto>`. It calls `RegisterUseCase.execute(body)` and returns `AuthMapper.toRegisterResponseDto(result)`. Response body after interceptor: `{ data: { accessToken, refreshToken, user: { id, name, email } } }`. Statuses: `201` success, `409 EMAIL_ALREADY_EXISTS`, `400 VALIDATION_ERROR`, `500` unexpected/database.

## Data Flow

```text
POST /api/v1/auth/register
  -> AuthController -> AuthMapper -> RegisterUseCase
  -> AuthUserRepository.findByEmail
  -> PasswordHasher.hash(password)
  -> AuthUserRepository.createWithPassword
  -> TokenService.signAccessToken / signRefreshToken
  -> PasswordHasher.hash(refreshToken)
  -> RefreshTokenRepository.save
  -> AuthMapper -> ResponseInterceptor { data }
```

## Testing Strategy

| Layer | What to test | Approach |
|---|---|---|
| Unit | `register.use-case.spec.ts` | `Test.createTestingModule`; mock `AuthUserRepository`, `RefreshTokenRepository`, `PasswordHasher`, `TokenService` with `vi.fn()` `useValue`. Cover happy path call order/shape, duplicate email error and short-circuit, password hash passed to create instead of plaintext, refresh token hash persisted instead of raw token. |
| E2E | `test/auth.e2e-spec.ts` | Match current Testcontainers pattern: `PostgreSqlContainer("postgres:17-alpine")`, set `DATABASE_URL`, `NODE_ENV=test`, and explicit `JWT_*` values before compiling `AppModule`, run `npx prisma db push`, create Nest app, install global `ValidationPipe`, `HttpExceptionFilter`, `ResponseInterceptor`, then use `supertest`. Assert happy path, duplicate email 409, invalid email, missing password, short password, missing name, DB password hash, DB refresh token hash, and no `passwordHash` in response. Existing E2E files remain safe because validation supplies test-only JWT defaults. |

## Migration / Rollout

No data backfill required. Add env vars before deployment, run migration, deploy auth module. Rollback is isolated: revert migration, remove `src/auth/`, `auth.config.ts`, env/schema/app/module/package changes. No existing endpoint behavior changes.

## Open Questions

None.
