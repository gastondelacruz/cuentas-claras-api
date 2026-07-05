import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Test, type TestingModule } from "@nestjs/testing";
import {
	PostgreSqlContainer,
	type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import * as argon2 from "argon2";
import { execSync } from "node:child_process";
import request from "supertest";
import { AppModule } from "../src/app.module";
import {
	MailDeliveryPort,
	type GroupInvitationEmailInput,
	type VerificationEmailInput,
} from "../src/shared/mail/domain/ports/mail-delivery.port";
import { HttpExceptionFilter } from "../src/shared/filters/http-exception.filter";
import { ResponseInterceptor } from "../src/shared/interceptors/response.interceptor";

describe("Auth login endpoint (e2e)", () => {
	let app: INestApplication;
	let postgresContainer: StartedPostgreSqlContainer;
	let prisma: PrismaClient;

	beforeAll(async () => {
		postgresContainer = await new PostgreSqlContainer("postgres:17-alpine")
			.withDatabase("cuentas_claras_test")
			.withUsername("postgres")
			.withPassword("postgres")
			.start();

		process.env.DATABASE_URL = postgresContainer.getConnectionUri();
		process.env.NODE_ENV = "test";
		process.env.JWT_ACCESS_SECRET = "test-access-secret-with-at-least-32-chars";
		process.env.JWT_REFRESH_SECRET =
			"test-refresh-secret-with-at-least-32-chars";
		process.env.JWT_ACCESS_TTL = "15m";
		process.env.JWT_REFRESH_TTL = "30d";

		execSync("npx prisma db push", {
			cwd: process.cwd(),
			env: process.env,
			stdio: "inherit",
		});

		const adapter = new PrismaPg({
			connectionString: process.env.DATABASE_URL,
		});
		prisma = new PrismaClient({ adapter });
		await prisma.$connect();

		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();

		app = moduleFixture.createNestApplication();
		app.useGlobalPipes(
			new ValidationPipe({
				whitelist: true,
				transform: true,
			}),
		);
		app.useGlobalFilters(new HttpExceptionFilter());
		app.useGlobalInterceptors(new ResponseInterceptor());

		await app.init();
	});

	afterAll(async () => {
		if (app) {
			await app.close();
		}

		if (prisma) {
			await prisma.$disconnect();
		}

		if (postgresContainer) {
			await postgresContainer.stop();
		}
	});

	beforeEach(async () => {
		await prisma.refreshToken.deleteMany();
		await prisma.user.deleteMany();
	});

	it("POST /api/v1/auth/login returns 200 with tokens and user after registration", async () => {
		await request(app.getHttpServer())
			.post("/api/v1/auth/register")
			.send({ email: "login@example.com", password: "SecureP4ss!", name: "Jane" })
			.expect(201);

		const response = await request(app.getHttpServer())
			.post("/api/v1/auth/login")
			.send({ email: "login@example.com", password: "SecureP4ss!" })
			.expect(200);

		expect(response.body).toEqual({
			data: {
				accessToken: expect.any(String),
				refreshToken: expect.any(String),
				user: {
					id: expect.any(String),
					name: "Jane",
					email: "login@example.com",
				},
			},
		});
		expect(response.body.data.user.passwordHash).toBeUndefined();

		const user = await prisma.user.findUniqueOrThrow({
			where: { email: "login@example.com" },
		});
		const refreshTokenRows = await prisma.refreshToken.findMany({
			where: { userId: user.id },
		});
		expect(refreshTokenRows).toHaveLength(2);

		const loginRefreshToken = refreshTokenRows.find((row) =>
			argon2.verify(row.tokenHash, response.body.data.refreshToken),
		);
		expect(loginRefreshToken).toBeDefined();
	});

	it("POST /api/v1/auth/login returns 401 INVALID_CREDENTIALS for wrong password", async () => {
		await request(app.getHttpServer())
			.post("/api/v1/auth/register")
			.send({ email: "login@example.com", password: "SecureP4ss!", name: "Jane" })
			.expect(201);

		const response = await request(app.getHttpServer())
			.post("/api/v1/auth/login")
			.send({ email: "login@example.com", password: "WrongPass!" })
			.expect(401);

		expect(response.body.error).toMatchObject({
			code: "INVALID_CREDENTIALS",
			message: "Invalid credentials.",
			type: "business",
			statusCode: 401,
		});
	});

	it("POST /api/v1/auth/login returns 401 INVALID_CREDENTIALS for nonexistent email", async () => {
		const response = await request(app.getHttpServer())
			.post("/api/v1/auth/login")
			.send({ email: "nobody@example.com", password: "SecureP4ss!" })
			.expect(401);

		expect(response.body.error).toMatchObject({
			code: "INVALID_CREDENTIALS",
			message: "Invalid credentials.",
			type: "business",
			statusCode: 401,
		});
	});

	it("POST /api/v1/auth/login returns 400 for invalid payloads", async () => {
		for (const payload of [
			{ email: "not-an-email", password: "SecureP4ss!" },
			{ email: "a@b.com" },
			{ password: "SecureP4ss!" },
		]) {
			await request(app.getHttpServer())
				.post("/api/v1/auth/login")
				.send(payload)
				.expect(400);
		}
	});
});

describe("Auth refresh token endpoint (e2e)", () => {
	let app: INestApplication;
	let postgresContainer: StartedPostgreSqlContainer;
	let prisma: PrismaClient;

	beforeAll(async () => {
		postgresContainer = await new PostgreSqlContainer("postgres:17-alpine")
			.withDatabase("cuentas_claras_test")
			.withUsername("postgres")
			.withPassword("postgres")
			.start();

		process.env.DATABASE_URL = postgresContainer.getConnectionUri();
		process.env.NODE_ENV = "test";
		process.env.JWT_ACCESS_SECRET = "test-access-secret-with-at-least-32-chars";
		process.env.JWT_REFRESH_SECRET = "test-refresh-secret-with-at-least-32-chars";
		process.env.JWT_ACCESS_TTL = "15m";
		process.env.JWT_REFRESH_TTL = "30d";

		execSync("npx prisma db push", {
			cwd: process.cwd(),
			env: process.env,
			stdio: "inherit",
		});

		const adapter = new PrismaPg({
			connectionString: process.env.DATABASE_URL,
		});
		prisma = new PrismaClient({ adapter });
		await prisma.$connect();

		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();

		app = moduleFixture.createNestApplication();
		app.useGlobalPipes(
			new ValidationPipe({
				whitelist: true,
				transform: true,
			}),
		);
		app.useGlobalFilters(new HttpExceptionFilter());
		app.useGlobalInterceptors(new ResponseInterceptor());

		await app.init();
	});

	afterAll(async () => {
		if (app) {
			await app.close();
		}

		if (prisma) {
			await prisma.$disconnect();
		}

		if (postgresContainer) {
			await postgresContainer.stop();
		}
	});

	beforeEach(async () => {
		await prisma.refreshToken.deleteMany();
		await prisma.user.deleteMany();
	});

	it("POST /api/v1/auth/refresh returns 200 with a new token pair; old token is revoked", async () => {
		// Register and login to get initial refresh token
		await request(app.getHttpServer())
			.post("/api/v1/auth/login")
			.send({ email: "refresh@example.com", password: "SecureP4ss!" })
			.expect(401); // user does not exist yet

		await request(app.getHttpServer())
			.post("/api/v1/auth/register")
			.send({ email: "refresh@example.com", password: "SecureP4ss!", name: "Refresh User" })
			.expect(201);

		const loginRes = await request(app.getHttpServer())
			.post("/api/v1/auth/login")
			.send({ email: "refresh@example.com", password: "SecureP4ss!" })
			.expect(200);

		const originalRefreshToken: string = loginRes.body.data.refreshToken;
		await prisma.user.update({
			where: { email: "refresh@example.com" },
			data: { emailVerifiedAt: new Date() },
		});

		// Refresh using the original token
		const refreshRes = await request(app.getHttpServer())
			.post("/api/v1/auth/refresh")
			.send({ refreshToken: originalRefreshToken })
			.expect(200);

		expect(refreshRes.body).toEqual({
			data: {
				accessToken: expect.any(String),
				refreshToken: expect.any(String),
			},
		});
		expect(refreshRes.body.data.user).toBeUndefined();

		// Verify the new access token works on a protected route
		await request(app.getHttpServer())
			.get("/api/v1/me/summary")
			.set("Authorization", `Bearer ${refreshRes.body.data.accessToken}`)
			.expect(200);

		// Old refresh token must be rejected
		await request(app.getHttpServer())
			.post("/api/v1/auth/refresh")
			.send({ refreshToken: originalRefreshToken })
			.expect(401);
	});

	it("POST /api/v1/auth/refresh returns 401 INVALID_REFRESH_TOKEN for a tampered token", async () => {
		const response = await request(app.getHttpServer())
			.post("/api/v1/auth/refresh")
			.send({ refreshToken: "invalid.tampered.token" })
			.expect(401);

		expect(response.body.error).toMatchObject({
			code: "INVALID_REFRESH_TOKEN",
			type: "business",
			statusCode: 401,
		});
	});

	it("POST /api/v1/auth/refresh returns 400 for missing refreshToken field", async () => {
		await request(app.getHttpServer())
			.post("/api/v1/auth/refresh")
			.send({})
			.expect(400);
	});
});

describe("POST /api/v1/auth/logout (e2e)", () => {
	let app: INestApplication;
	let postgresContainer: StartedPostgreSqlContainer;
	let prisma: PrismaClient;

	beforeAll(async () => {
		postgresContainer = await new PostgreSqlContainer("postgres:17-alpine")
			.withDatabase("cuentas_claras_test")
			.withUsername("postgres")
			.withPassword("postgres")
			.start();

		process.env.DATABASE_URL = postgresContainer.getConnectionUri();
		process.env.NODE_ENV = "test";
		process.env.JWT_ACCESS_SECRET = "test-access-secret-with-at-least-32-chars";
		process.env.JWT_REFRESH_SECRET =
			"test-refresh-secret-with-at-least-32-chars";
		process.env.JWT_ACCESS_TTL = "15m";
		process.env.JWT_REFRESH_TTL = "30d";

		execSync("npx prisma db push", {
			cwd: process.cwd(),
			env: process.env,
			stdio: "inherit",
		});

		const adapter = new PrismaPg({
			connectionString: process.env.DATABASE_URL,
		});
		prisma = new PrismaClient({ adapter });
		await prisma.$connect();

		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();

		app = moduleFixture.createNestApplication();
		app.useGlobalPipes(
			new ValidationPipe({
				whitelist: true,
				transform: true,
			}),
		);
		app.useGlobalFilters(new HttpExceptionFilter());
		app.useGlobalInterceptors(new ResponseInterceptor());

		await app.init();
	});

	afterAll(async () => {
		if (app) {
			await app.close();
		}
		if (prisma) {
			await prisma.$disconnect();
		}
		if (postgresContainer) {
			await postgresContainer.stop();
		}
	});

	beforeEach(async () => {
		await prisma.refreshToken.deleteMany();
		await prisma.user.deleteMany();
	});

	it("returns 204 and revokes the refresh token (happy path)", async () => {
		const registerRes = await request(app.getHttpServer())
			.post("/api/v1/auth/register")
			.send({ email: "logout@example.com", password: "SecureP4ss!", name: "Logout User" })
			.expect(201);

		const { accessToken, refreshToken } = registerRes.body.data;

		await request(app.getHttpServer())
			.post("/api/v1/auth/logout")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({ refreshToken })
			.expect(204);
	});

	it("returns 401 when no Bearer token is provided", async () => {
		await request(app.getHttpServer())
			.post("/api/v1/auth/logout")
			.send({ refreshToken: "some-token" })
			.expect(401);
	});

	it("returns 400 when refreshToken field is missing", async () => {
		const registerRes = await request(app.getHttpServer())
			.post("/api/v1/auth/register")
			.send({ email: "logout-missing@example.com", password: "SecureP4ss!", name: "Logout User" })
			.expect(201);

		await request(app.getHttpServer())
			.post("/api/v1/auth/logout")
			.set("Authorization", `Bearer ${registerRes.body.data.accessToken}`)
			.send({})
			.expect(400);
	});

	it("returns 204 for unknown refresh token (idempotent)", async () => {
		const registerRes = await request(app.getHttpServer())
			.post("/api/v1/auth/register")
			.send({ email: "logout-unk@example.com", password: "SecureP4ss!", name: "Logout User" })
			.expect(201);

		await request(app.getHttpServer())
			.post("/api/v1/auth/logout")
			.set("Authorization", `Bearer ${registerRes.body.data.accessToken}`)
			.send({ refreshToken: "non-existent-token" })
			.expect(204);
	});

	it("returns 204 a second time for the same revoked token (idempotent)", async () => {
		const registerRes = await request(app.getHttpServer())
			.post("/api/v1/auth/register")
			.send({ email: "logout-idem@example.com", password: "SecureP4ss!", name: "Logout User" })
			.expect(201);

		const { accessToken, refreshToken } = registerRes.body.data;

		await request(app.getHttpServer())
			.post("/api/v1/auth/logout")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({ refreshToken })
			.expect(204);

		await request(app.getHttpServer())
			.post("/api/v1/auth/logout")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({ refreshToken })
			.expect(204);
	});

	it("POST /api/v1/auth/refresh returns 401 after the refresh token has been revoked via logout", async () => {
		const registerRes = await request(app.getHttpServer())
			.post("/api/v1/auth/register")
			.send({ email: "logout-refresh@example.com", password: "SecureP4ss!", name: "Logout User" })
			.expect(201);

		const { accessToken, refreshToken } = registerRes.body.data;

		await request(app.getHttpServer())
			.post("/api/v1/auth/logout")
			.set("Authorization", `Bearer ${accessToken}`)
			.send({ refreshToken })
			.expect(204);

		await request(app.getHttpServer())
			.post("/api/v1/auth/refresh")
			.send({ refreshToken })
			.expect(401);
	});
});

describe("Auth registration endpoint (e2e)", () => {
	let app: INestApplication;
	let postgresContainer: StartedPostgreSqlContainer;
	let prisma: PrismaClient;

	beforeAll(async () => {
		postgresContainer = await new PostgreSqlContainer("postgres:17-alpine")
			.withDatabase("cuentas_claras_test")
			.withUsername("postgres")
			.withPassword("postgres")
			.start();

		process.env.DATABASE_URL = postgresContainer.getConnectionUri();
		process.env.NODE_ENV = "test";
		process.env.JWT_ACCESS_SECRET = "test-access-secret-with-at-least-32-chars";
		process.env.JWT_REFRESH_SECRET = "test-refresh-secret-with-at-least-32-chars";
		process.env.JWT_ACCESS_TTL = "15m";
		process.env.JWT_REFRESH_TTL = "30d";

		execSync("npx prisma db push", {
			cwd: process.cwd(),
			env: process.env,
			stdio: "inherit",
		});

		const adapter = new PrismaPg({
			connectionString: process.env.DATABASE_URL,
		});
		prisma = new PrismaClient({ adapter });
		await prisma.$connect();

		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();

		app = moduleFixture.createNestApplication();
		app.useGlobalPipes(
			new ValidationPipe({
				whitelist: true,
				transform: true,
			}),
		);
		app.useGlobalFilters(new HttpExceptionFilter());
		app.useGlobalInterceptors(new ResponseInterceptor());

		await app.init();
	});

	afterAll(async () => {
		if (app) {
			await app.close();
		}

		if (prisma) {
			await prisma.$disconnect();
		}

		if (postgresContainer) {
			await postgresContainer.stop();
		}
	});

	beforeEach(async () => {
		await prisma.refreshToken.deleteMany();
		await prisma.user.deleteMany();
	});

	it("POST /api/v1/auth/register creates a user, returns tokens, and stores only hashes", async () => {
		const response = await request(app.getHttpServer())
			.post("/api/v1/auth/register")
			.send({
				email: "new@example.com",
				password: "SecureP4ss!",
				name: "Jane",
			})
			.expect(201);

		expect(response.body).toEqual({
			data: {
				accessToken: expect.any(String),
				refreshToken: expect.any(String),
				user: {
					id: expect.any(String),
					name: "Jane",
					email: "new@example.com",
				},
			},
		});
		expect(response.body.data.user.passwordHash).toBeUndefined();

		const user = await prisma.user.findUniqueOrThrow({
			where: {
				email: "new@example.com",
			},
		});
		expect(user.passwordHash).not.toBe("SecureP4ss!");
		await expect(argon2.verify(user.passwordHash!, "SecureP4ss!")).resolves.toBe(
			true,
		);

		const persistedRefreshToken = await prisma.refreshToken.findFirstOrThrow({
			where: {
				userId: user.id,
			},
		});
		expect(persistedRefreshToken.tokenHash).not.toBe(
			response.body.data.refreshToken,
		);
		await expect(
			argon2.verify(
				persistedRefreshToken.tokenHash,
				response.body.data.refreshToken,
			),
		).resolves.toBe(true);
		expect(persistedRefreshToken.expiresAt.getTime()).toBeGreaterThan(Date.now());

		const accounts = await prisma.account.findMany({
			where: {
				userId: user.id,
				isDefault: true,
				archivedAt: null,
			},
		});
		expect(accounts).toHaveLength(1);
		expect(accounts[0]).toMatchObject({
			name: "Cuenta principal",
			currency: "ARS",
			kind: "CASH",
			isDefault: true,
		});
	});

	it("POST /api/v1/auth/register returns EMAIL_ALREADY_EXISTS for duplicate email", async () => {
		await prisma.user.create({
			data: {
				email: "taken@example.com",
				name: "Taken",
				passwordHash: await argon2.hash("SecureP4ss!"),
			},
		});

		const response = await request(app.getHttpServer())
			.post("/api/v1/auth/register")
			.send({
				email: "taken@example.com",
				password: "SecureP4ss!",
				name: "Dup",
			})
			.expect(409);

		expect(response.body.error).toEqual({
			code: "EMAIL_ALREADY_EXISTS",
			message: "Email already registered.",
			type: "business",
			statusCode: 409,
			path: "/api/v1/auth/register",
			timestamp: expect.any(String),
		});
	});

	it("POST /api/v1/auth/register returns 400 for invalid payloads", async () => {
		for (const payload of [
			{ email: "not-an-email", password: "SecureP4ss!", name: "Jane" },
			{ email: "a@b.com", name: "Jane" },
			{ email: "a@b.com", password: "short", name: "Jane" },
			{ email: "a@b.com", password: "SecureP4ss!" },
			{ email: "a@b.com", password: "SecureP4ss!", name: "   " },
		]) {
			await request(app.getHttpServer())
				.post("/api/v1/auth/register")
				.send(payload)
				.expect(400);
		}
	});
});

describe("Email verification endpoints (e2e)", () => {
	let app: INestApplication;
	let postgresContainer: StartedPostgreSqlContainer;
	let prisma: PrismaClient;
	let mail: CapturingMailDelivery;

	beforeAll(async () => {
		postgresContainer = await new PostgreSqlContainer("postgres:17-alpine")
			.withDatabase("cuentas_claras_test")
			.withUsername("postgres")
			.withPassword("postgres")
			.start();

		process.env.DATABASE_URL = postgresContainer.getConnectionUri();
		process.env.NODE_ENV = "test";
		process.env.JWT_ACCESS_SECRET = "test-access-secret-with-at-least-32-chars";
		process.env.JWT_REFRESH_SECRET = "test-refresh-secret-with-at-least-32-chars";
		process.env.JWT_ACCESS_TTL = "15m";
		process.env.JWT_REFRESH_TTL = "30d";

		execSync("npx prisma db push", {
			cwd: process.cwd(),
			env: process.env,
			stdio: "inherit",
		});

		const adapter = new PrismaPg({
			connectionString: process.env.DATABASE_URL,
		});
		prisma = new PrismaClient({ adapter });
		await prisma.$connect();

		mail = new CapturingMailDelivery();
		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule],
		})
			.overrideProvider(MailDeliveryPort)
			.useValue(mail)
			.compile();

		app = moduleFixture.createNestApplication();
		app.useGlobalPipes(
			new ValidationPipe({
				whitelist: true,
				transform: true,
			}),
		);
		app.useGlobalFilters(new HttpExceptionFilter());
		app.useGlobalInterceptors(new ResponseInterceptor());

		await app.init();
	});

	afterAll(async () => {
		if (app) {
			await app.close();
		}

		if (prisma) {
			await prisma.$disconnect();
		}

		if (postgresContainer) {
			await postgresContainer.stop();
		}
	});

	beforeEach(async () => {
		mail.clear();
		await prisma.emailVerificationToken.deleteMany();
		await prisma.refreshToken.deleteMany();
		await prisma.account.deleteMany();
		await prisma.user.deleteMany();
	});

	it("POST /api/v1/auth/email-verification/verify consumes a registration token and marks the user verified", async () => {
		const registerResponse = await request(app.getHttpServer())
			.post("/api/v1/auth/register")
			.send({ email: "verify@example.com", password: "SecureP4ss!", name: "Verify User" })
			.expect(201);
		const token = extractToken(mail.verificationEmails[0].verificationUrl);

		await request(app.getHttpServer())
			.post("/api/v1/auth/email-verification/verify")
			.send({ token })
			.expect(204);

		const user = await prisma.user.findUniqueOrThrow({
			where: { id: registerResponse.body.data.user.id },
		});
		const consumedTokens = await prisma.emailVerificationToken.findMany({
			where: { userId: user.id, consumedAt: { not: null } },
		});
		expect(user.emailVerifiedAt).toEqual(expect.any(Date));
		expect(consumedTokens).toHaveLength(1);
	});

	it("POST /api/v1/auth/email-verification/resend invalidates older active tokens and sends one replacement", async () => {
		const registerResponse = await request(app.getHttpServer())
			.post("/api/v1/auth/register")
			.send({ email: "resend@example.com", password: "SecureP4ss!", name: "Resend User" })
			.expect(201);

		await request(app.getHttpServer())
			.post("/api/v1/auth/email-verification/resend")
			.set("Authorization", `Bearer ${registerResponse.body.data.accessToken}`)
			.expect(204);

		const tokens = await prisma.emailVerificationToken.findMany({
			where: { userId: registerResponse.body.data.user.id },
		});
		expect(tokens).toHaveLength(2);
		expect(tokens.filter((token) => token.consumedAt === null)).toHaveLength(1);
		expect(mail.verificationEmails).toHaveLength(2);
	});

	it("GET /api/v1/auth/email-verification/status returns the current verification state", async () => {
		const registerResponse = await request(app.getHttpServer())
			.post("/api/v1/auth/register")
			.send({ email: "status@example.com", password: "SecureP4ss!", name: "Status User" })
			.expect(201);

		await request(app.getHttpServer())
			.get("/api/v1/auth/email-verification/status")
			.set("Authorization", `Bearer ${registerResponse.body.data.accessToken}`)
			.expect(200)
			.expect((response) => {
				expect(response.body).toEqual({
					data: {
						verified: false,
						verifiedAt: null,
					},
				});
			});
	});

	it("POST /api/v1/auth/email-verification/resend keeps durable state when mail delivery fails", async () => {
		const registerResponse = await request(app.getHttpServer())
			.post("/api/v1/auth/register")
			.send({ email: "mail-fail@example.com", password: "SecureP4ss!", name: "Mail Fail" })
			.expect(201);
		mail.failVerification = true;

		await request(app.getHttpServer())
			.post("/api/v1/auth/email-verification/resend")
			.set("Authorization", `Bearer ${registerResponse.body.data.accessToken}`)
			.expect(204);

		const activeTokens = await prisma.emailVerificationToken.findMany({
			where: {
				userId: registerResponse.body.data.user.id,
				consumedAt: null,
			},
		});
		expect(activeTokens).toHaveLength(1);
	});
});

class CapturingMailDelivery extends MailDeliveryPort {
	verificationEmails: VerificationEmailInput[] = [];
	groupInvitationEmails: GroupInvitationEmailInput[] = [];
	failVerification = false;
	failInvitation = false;

	async sendVerificationEmail(input: VerificationEmailInput): Promise<void> {
		this.verificationEmails.push(input);

		if (this.failVerification) {
			throw new Error("verification mail failed");
		}
	}

	async sendGroupInvitationEmail(input: GroupInvitationEmailInput): Promise<void> {
		this.groupInvitationEmails.push(input);

		if (this.failInvitation) {
			throw new Error("invitation mail failed");
		}
	}

	clear(): void {
		this.verificationEmails = [];
		this.groupInvitationEmails = [];
		this.failVerification = false;
		this.failInvitation = false;
	}
}

function extractToken(url: string): string {
	const parsed = new URL(url);
	const token = parsed.searchParams.get("token");

	if (!token) {
		throw new Error("Expected token query parameter.");
	}

	return token;
}
