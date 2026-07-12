import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Test, type TestingModule } from "@nestjs/testing";
import {
	PostgreSqlContainer,
	type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { HttpExceptionFilter } from "../src/shared/filters/http-exception.filter";
import { ResponseInterceptor } from "../src/shared/interceptors/response.interceptor";
import {
	configureDefaultBearerAuth,
	createBearerToken,
	registerAndLogin,
} from "./helpers/auth.helper";

const DEV_USER_ID = "00000000-0000-0000-0000-000000000001";
const DEV_USER_EMAIL = "dev@cuentasclaras.local";
const DEV_DEFAULT_ACCOUNT_ID = "00000000-0000-0000-0000-000000000002";

function runPrismaCommand(command: string): void {
	try {
		execSync(command, {
			cwd: process.cwd(),
			env: process.env,
			stdio: "inherit",
		});
	} catch (error) {
		throw new Error(`Failed to run ${command}`, { cause: error });
	}
}

describe("Personal transactions endpoint (e2e)", () => {
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

		runPrismaCommand("pnpm exec prisma migrate deploy");
		runPrismaCommand("pnpm exec prisma db seed");

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
		configureDefaultBearerAuth(
			app,
			createBearerToken({ userId: DEV_USER_ID, email: DEV_USER_EMAIL }),
		);

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
		await prisma.personalTransaction.deleteMany();
		await prisma.account.deleteMany({
			where: {
				userId: {
					not: DEV_USER_ID,
				},
			},
		});
		await prisma.user.deleteMany({
			where: {
				id: {
					not: DEV_USER_ID,
				},
			},
		});
	});

	it("GET /api/v1/me/personal-transactions filters by type", async () => {
		await createTransaction({ type: "expense", amount: 100 });
		await createTransaction({ type: "income", amount: 200 });

		const response = await request(app.getHttpServer())
			.get("/api/v1/me/personal-transactions")
			.query({ type: "expense", range: "year" })
			.expect(200);

		expect(response.body).toEqual({
			data: {
				transactions: [
					{
						id: expect.any(String),
						type: "expense",
						expenseKind: "variable",
						amount: 100,
						currency: "ARS",
						category: "Alimentación",
						accountId: DEV_DEFAULT_ACCOUNT_ID,
						accountName: "Cuenta principal",
						occurredAt: "2026-06-29T10:00:00.000Z",
						note: null,
						createdAt: expect.any(String),
						updatedAt: expect.any(String),
					},
				],
				nextCursor: null,
				total: -100,
				incomeTotal: 0,
				expenseTotal: 100,
				currency: "ARS",
			},
		});
	});

	it("GET /api/v1/me/personal-transactions filters by category and expenseKind", async () => {
		await createTransaction({
			type: "expense",
			expenseKind: "fixed",
			amount: 100,
			category: "Food",
		});
		await createTransaction({
			type: "expense",
			expenseKind: "variable",
			amount: 200,
			category: "Food",
		});
		await createTransaction({
			type: "expense",
			expenseKind: "fixed",
			amount: 300,
			category: "Transport",
		});

		const response = await request(app.getHttpServer())
			.get("/api/v1/me/personal-transactions")
			.query({
				type: "expense",
				category: "Food",
				expenseKind: "fixed",
				range: "year",
			})
			.expect(200);

		expect(response.body.data.transactions).toHaveLength(1);
		expect(response.body.data.transactions[0]).toMatchObject({
			type: "expense",
			expenseKind: "fixed",
			amount: 100,
			category: "Food",
		});
		expect(response.body.data).toMatchObject({
			total: -100,
			incomeTotal: 0,
			expenseTotal: 100,
		});
	});

	it("GET /api/v1/me/personal-transactions returns 403 when the user has not verified email", async () => {
		const unverifiedUser = await registerAndLogin(app, {
			emailVerified: false,
		});

		const response = await request(app.getHttpServer())
			.get("/api/v1/me/personal-transactions")
			.set("Authorization", unverifiedUser.authorization)
			.expect(403);

		expect(response.body.error).toMatchObject({
			code: "EMAIL_NOT_VERIFIED",
			statusCode: 403,
		});
	});

	it("GET /api/v1/me/personal-transactions filters by range", async () => {
		const today = new Date();
		const yesterday = new Date(today);
		yesterday.setUTCDate(today.getUTCDate() - 1);

		await createTransaction({
			type: "expense",
			amount: 100,
			occurredAt: today,
		});
		await createTransaction({
			type: "expense",
			amount: 200,
			occurredAt: yesterday,
		});

		const response = await request(app.getHttpServer())
			.get("/api/v1/me/personal-transactions")
			.query({ range: "day" })
			.expect(200);

		expect(response.body.data.transactions).toHaveLength(1);
		expect(response.body.data.transactions[0].amount).toBe(100);
	});

	it("GET /api/v1/me/personal-transactions filters using range=period with explicit from/to", async () => {
		await createTransaction({
			type: "expense",
			amount: 100,
			occurredAt: new Date("2026-06-15T10:00:00.000Z"),
		});
		await createTransaction({
			type: "expense",
			amount: 200,
			occurredAt: new Date("2026-06-20T10:00:00.000Z"),
		});
		await createTransaction({
			type: "expense",
			amount: 300,
			occurredAt: new Date("2026-06-25T10:00:00.000Z"),
		});

		const response = await request(app.getHttpServer())
			.get("/api/v1/me/personal-transactions")
			.query({
				range: "period",
				from: "2026-06-18T00:00:00.000Z",
				to: "2026-06-22T00:00:00.000Z",
			})
			.expect(200);

		expect(response.body.data.transactions).toHaveLength(1);
		expect(response.body.data.transactions[0].amount).toBe(200);
		expect(response.body.data.expenseTotal).toBe(200);
	});

	it("GET /api/v1/me/personal-transactions returns 400 PERSONAL_TX_INVALID_PERIOD for an invalid range", async () => {
		const response = await request(app.getHttpServer())
			.get("/api/v1/me/personal-transactions")
			.query({ range: "quarter" })
			.expect(400);

		expect(response.body.error).toMatchObject({
			code: "PERSONAL_TX_INVALID_PERIOD",
			statusCode: 400,
		});
	});

	it("GET /api/v1/me/personal-transactions returns 400 PERSONAL_TX_INVALID_PERIOD when range=period is missing from/to", async () => {
		const missingBoth = await request(app.getHttpServer())
			.get("/api/v1/me/personal-transactions")
			.query({ range: "period" })
			.expect(400);

		expect(missingBoth.body.error).toMatchObject({
			code: "PERSONAL_TX_INVALID_PERIOD",
			statusCode: 400,
		});

		const missingTo = await request(app.getHttpServer())
			.get("/api/v1/me/personal-transactions")
			.query({ range: "period", from: "2026-06-01T00:00:00.000Z" })
			.expect(400);

		expect(missingTo.body.error).toMatchObject({
			code: "PERSONAL_TX_INVALID_PERIOD",
			statusCode: 400,
		});
	});

	it("GET /api/v1/me/personal-transactions paginates with cursor", async () => {
		for (let index = 0; index < 5; index++) {
			await createTransaction({
				type: "expense",
				amount: 100 + index,
				occurredAt: new Date(`2026-06-${20 - index}T10:00:00.000Z`),
			});
		}

		const firstPage = await request(app.getHttpServer())
			.get("/api/v1/me/personal-transactions")
			.query({ limit: 2, range: "year" })
			.expect(200);

		expect(firstPage.body.data.transactions).toHaveLength(2);
		expect(firstPage.body.data.nextCursor).toEqual(expect.any(String));

		const secondPage = await request(app.getHttpServer())
			.get("/api/v1/me/personal-transactions")
			.query({
				limit: 2,
				range: "year",
				cursor: firstPage.body.data.nextCursor,
			})
			.expect(200);

		expect(secondPage.body.data.transactions).toHaveLength(2);
		expect(secondPage.body.data.transactions[0].id).not.toBe(
			firstPage.body.data.transactions[0].id,
		);
		expect(secondPage.body.data.transactions[0].id).not.toBe(
			firstPage.body.data.transactions[1].id,
		);
		expect(secondPage.body.data.nextCursor).toEqual(expect.any(String));

		const thirdPage = await request(app.getHttpServer())
			.get("/api/v1/me/personal-transactions")
			.query({
				limit: 2,
				range: "year",
				cursor: secondPage.body.data.nextCursor,
			})
			.expect(200);

		expect(thirdPage.body.data.transactions).toHaveLength(1);
		expect(thirdPage.body.data.nextCursor).toBeNull();
	});

	it("GET /api/v1/me/personal-transactions returns 400 for an invalid cursor", async () => {
		const response = await request(app.getHttpServer())
			.get("/api/v1/me/personal-transactions")
			.query({ cursor: "invalid-cursor" })
			.expect(400);

		expect(response.body.error).toMatchObject({
			code: "PERSONAL_TX_INVALID_CURSOR",
			statusCode: 400,
		});
	});

	it("GET /api/v1/me/personal-transactions keeps ordering stable for identical occurredAt values", async () => {
		const sharedOccurredAt = new Date("2026-06-29T10:00:00.000Z");
		const first = await createTransaction({
			type: "expense",
			amount: 100,
			occurredAt: sharedOccurredAt,
		});
		const second = await createTransaction({
			type: "expense",
			amount: 200,
			occurredAt: sharedOccurredAt,
		});

		const firstPage = await request(app.getHttpServer())
			.get("/api/v1/me/personal-transactions")
			.query({ limit: 1, range: "year" })
			.expect(200);

		expect(firstPage.body.data.transactions).toHaveLength(1);

		const secondPage = await request(app.getHttpServer())
			.get("/api/v1/me/personal-transactions")
			.query({
				limit: 1,
				range: "year",
				cursor: firstPage.body.data.nextCursor,
			})
			.expect(200);

		const firstIds = [
			firstPage.body.data.transactions[0].id,
			secondPage.body.data.transactions[0].id,
		];
		expect(firstIds).toContain(first.id);
		expect(firstIds).toContain(second.id);
		expect(new Set(firstIds).size).toBe(2);
	});

	it("GET /api/v1/me/personal-transactions/summary returns global totals and category percentages", async () => {
		await createTransaction({
			type: "expense",
			amount: 100,
			category: "Food",
			occurredAt: new Date("2026-06-10T10:00:00.000Z"),
		});
		await createTransaction({
			type: "expense",
			amount: 300,
			category: "Transport",
			occurredAt: new Date("2026-06-11T10:00:00.000Z"),
		});
		await createTransaction({
			type: "income",
			amount: 1000,
			category: "Salary",
			occurredAt: new Date("2026-06-12T10:00:00.000Z"),
		});

		const response = await request(app.getHttpServer())
			.get("/api/v1/me/personal-transactions/summary")
			.query({
				range: "period",
				from: "2026-06-01T00:00:00.000Z",
				to: "2026-07-01T00:00:00.000Z",
			})
			.expect(200);

		expect(response.body).toEqual({
			data: {
				total: 600,
				incomeTotal: 1000,
				expenseTotal: 400,
				currency: "ARS",
				breakdown: expect.arrayContaining([
					{
						category: "Salary",
						type: "income",
						amount: 1000,
						percentage: 100,
					},
					{
						category: "Food",
						type: "expense",
						amount: 100,
						percentage: 25,
					},
					{
						category: "Transport",
						type: "expense",
						amount: 300,
						percentage: 75,
					},
				]),
			},
		});
		expect(response.body.data.breakdown).toHaveLength(3);
	});

	it("GET /api/v1/me/personal-transactions/summary rejects invalid custom periods", async () => {
		const missingTo = await request(app.getHttpServer())
			.get("/api/v1/me/personal-transactions/summary")
			.query({ range: "period", from: "2026-06-01T00:00:00.000Z" })
			.expect(400);

		expect(missingTo.body.error).toMatchObject({
			code: "PERSONAL_TX_INVALID_PERIOD",
			statusCode: 400,
		});

		const reversedRange = await request(app.getHttpServer())
			.get("/api/v1/me/personal-transactions/summary")
			.query({
				range: "period",
				from: "2026-07-01T00:00:00.000Z",
				to: "2026-06-01T00:00:00.000Z",
			})
			.expect(400);

		expect(reversedRange.body.error).toMatchObject({
			code: "PERSONAL_TX_INVALID_PERIOD",
			statusCode: 400,
		});
	});

	it("GET /api/v1/me/personal-transactions/summary only summarizes the authenticated user's transactions", async () => {
		await createTransaction({ type: "expense", amount: 100 });

		const otherUser = await registerAndLogin(app);
		const otherAccount = await prisma.account.findFirstOrThrow({
			where: {
				userId: otherUser.userId,
				isDefault: true,
				archivedAt: null,
			},
		});
		await prisma.personalTransaction.create({
			data: {
				userId: otherUser.userId,
				accountId: otherAccount.id,
				type: "income",
				amount: "999",
				currency: "ARS",
				category: "Salary",
				occurredAt: new Date("2026-06-29T10:00:00.000Z"),
			},
		});

		const response = await request(app.getHttpServer())
			.get("/api/v1/me/personal-transactions/summary")
			.set("Authorization", otherUser.authorization)
			.query({ range: "year" })
			.expect(200);

		expect(response.body.data).toMatchObject({
			total: 999,
			incomeTotal: 999,
			expenseTotal: 0,
		});
		expect(response.body.data.breakdown).toEqual([
			{
				category: "Salary",
				type: "income",
				amount: 999,
				percentage: 100,
			},
		]);
	});

	it("GET /api/v1/me/personal-transactions/summary returns 401 without a valid JWT", async () => {
		await request(app.getHttpServer())
			.get("/api/v1/me/personal-transactions/summary")
			.set("x-skip-test-auth", "1")
			.expect(401);
	});

	it("POST /api/v1/me/personal-transactions creates a transaction using the default account", async () => {
		const response = await request(app.getHttpServer())
			.post("/api/v1/me/personal-transactions")
			.send({
				type: "expense",
				amount: 1500,
				currency: "ARS",
				category: "Alimentación",
				occurredAt: "2026-06-29T12:00:00.000Z",
			})
			.expect(201);

		expect(response.body).toEqual({
			data: {
				id: expect.any(String),
				accountId: DEV_DEFAULT_ACCOUNT_ID,
				accountName: "Cuenta principal",
				type: "expense",
				expenseKind: "variable",
				amount: 1500,
				currency: "ARS",
				category: "Alimentación",
				occurredAt: "2026-06-29T12:00:00.000Z",
				note: null,
				createdAt: expect.any(String),
				updatedAt: expect.any(String),
			},
		});
	});

	it("POST /api/v1/me/personal-transactions creates a fixed expense transaction", async () => {
		const response = await request(app.getHttpServer())
			.post("/api/v1/me/personal-transactions")
			.send({
				type: "expense",
				expenseKind: "fixed",
				amount: 1500,
				currency: "ARS",
				category: "Alimentación",
				occurredAt: "2026-06-29T12:00:00.000Z",
			})
			.expect(201);

		expect(response.body.data).toMatchObject({
			type: "expense",
			expenseKind: "fixed",
		});
	});

	it("POST /api/v1/me/personal-transactions rejects expense kind for income", async () => {
		const response = await request(app.getHttpServer())
			.post("/api/v1/me/personal-transactions")
			.send({
				type: "income",
				expenseKind: "fixed",
				amount: 5000,
				currency: "ARS",
				category: "Salario",
				occurredAt: "2026-06-29T12:00:00.000Z",
			})
			.expect(400);

		expect(response.body.error).toMatchObject({
			code: "PERSONAL_TX_EXPENSE_KIND_NOT_ALLOWED",
			statusCode: 400,
		});
	});

	it("POST /api/v1/me/personal-transactions creates a transaction with an explicit accountId", async () => {
		const account = await prisma.account.create({
			data: {
				userId: DEV_USER_ID,
				name: "Cash",
				kind: "CASH",
				currency: "ARS",
				isDefault: false,
			},
		});

		const response = await request(app.getHttpServer())
			.post("/api/v1/me/personal-transactions")
			.send({
				accountId: account.id,
				type: "income",
				amount: 5000,
				currency: "ARS",
				category: "Salario",
				occurredAt: "2026-06-29T12:00:00.000Z",
			})
			.expect(201);

		expect(response.body.data).toMatchObject({
			accountId: account.id,
			accountName: "Cash",
		});
	});

	it("POST /api/v1/me/personal-transactions returns 400 for a category not allowed for the type", async () => {
		const response = await request(app.getHttpServer())
			.post("/api/v1/me/personal-transactions")
			.send({
				type: "expense",
				amount: 100,
				currency: "ARS",
				category: "Salario",
				occurredAt: "2026-06-29T12:00:00.000Z",
			})
			.expect(400);

		expect(response.body.error).toMatchObject({
			code: "PERSONAL_TX_CATEGORY_NOT_ALLOWED",
			statusCode: 400,
		});
	});

	it("POST /api/v1/me/personal-transactions returns 400 when amount is negative", async () => {
		const response = await request(app.getHttpServer())
			.post("/api/v1/me/personal-transactions")
			.send({
				type: "expense",
				amount: -10,
				currency: "ARS",
				category: "Alimentación",
				occurredAt: "2026-06-29T12:00:00.000Z",
			})
			.expect(400);

		expect(response.body.error).toMatchObject({
			code: "VALIDATION_ERROR",
			statusCode: 400,
		});
	});

	it("POST /api/v1/me/personal-transactions returns 400 when note exceeds 200 characters", async () => {
		const response = await request(app.getHttpServer())
			.post("/api/v1/me/personal-transactions")
			.send({
				type: "expense",
				amount: 100,
				currency: "ARS",
				category: "Alimentación",
				occurredAt: "2026-06-29T12:00:00.000Z",
				note: "a".repeat(201),
			})
			.expect(400);

		expect(response.body.error).toMatchObject({
			code: "VALIDATION_ERROR",
			statusCode: 400,
		});
	});

	it("POST /api/v1/me/personal-transactions returns 404 for a non-existent or foreign account", async () => {
		const otherUser = await registerAndLogin(app);
		const otherAccount = await prisma.account.create({
			data: {
				userId: otherUser.userId,
				name: "Foreign account",
				kind: "BANK",
				currency: "ARS",
				isDefault: false,
			},
		});

		const response = await request(app.getHttpServer())
			.post("/api/v1/me/personal-transactions")
			.send({
				accountId: otherAccount.id,
				type: "expense",
				amount: 100,
				currency: "ARS",
				category: "Alimentación",
				occurredAt: "2026-06-29T12:00:00.000Z",
			})
			.expect(404);

		expect(response.body.error).toMatchObject({
			code: "PERSONAL_TX_ACCOUNT_NOT_FOUND",
			statusCode: 404,
		});
	});

	it("POST /api/v1/me/personal-transactions lets a freshly registered user create a transaction with the auto-created default account", async () => {
		const otherUser = await registerAndLogin(app);

		const response = await request(app.getHttpServer())
			.post("/api/v1/me/personal-transactions")
			.set("Authorization", otherUser.authorization)
			.send({
				type: "expense",
				amount: 100,
				currency: "ARS",
				category: "Alimentación",
				occurredAt: "2026-06-29T12:00:00.000Z",
			})
			.expect(201);

		const defaultAccount = await prisma.account.findFirstOrThrow({
			where: {
				userId: otherUser.userId,
				isDefault: true,
				archivedAt: null,
			},
		});
		expect(response.body.data).toMatchObject({
			accountId: defaultAccount.id,
			accountName: defaultAccount.name,
			type: "expense",
			amount: 100,
			currency: "ARS",
			category: "Alimentación",
		});
	});

	it("PATCH /api/v1/me/personal-transactions/:transactionId updates a transaction owned by the authenticated user", async () => {
		const transaction = await createTransaction({
			type: "expense",
			amount: 100,
		});

		await new Promise((resolve) => setTimeout(resolve, 10));

		const response = await request(app.getHttpServer())
			.patch(`/api/v1/me/personal-transactions/${transaction.id}`)
			.send({
				amount: 250,
				category: "Ocio",
				note: "Taxi",
			})
			.expect(200);

		expect(response.body.data).toMatchObject({
			id: transaction.id,
			type: "expense",
			amount: 250,
			currency: "ARS",
			category: "Ocio",
			accountId: DEV_DEFAULT_ACCOUNT_ID,
			accountName: "Cuenta principal",
			note: "Taxi",
		});
		expect(response.body.data.createdAt).toEqual(expect.any(String));
		expect(response.body.data.updatedAt).toEqual(expect.any(String));

		const createdAt = new Date(response.body.data.createdAt).getTime();
		const updatedAt = new Date(response.body.data.updatedAt).getTime();
		expect(updatedAt).toBeGreaterThan(createdAt);
	});

	it("DELETE /api/v1/me/personal-transactions/:transactionId deletes a transaction owned by the authenticated user", async () => {
		const transaction = await createTransaction({
			type: "expense",
			amount: 100,
		});

		await request(app.getHttpServer())
			.delete(`/api/v1/me/personal-transactions/${transaction.id}`)
			.expect(204)
			.expect("");

		expect(
			await prisma.personalTransaction.findUnique({
				where: { id: transaction.id },
			}),
		).toBeNull();
	});

	it("DELETE /api/v1/me/personal-transactions/:transactionId protects transactions owned by another user", async () => {
		const transaction = await createTransaction({
			type: "expense",
			amount: 100,
		});
		const otherUser = await registerAndLogin(app);

		const response = await request(app.getHttpServer())
			.delete(`/api/v1/me/personal-transactions/${transaction.id}`)
			.set("Authorization", otherUser.authorization)
			.expect(404);

		expect(response.body.error).toMatchObject({
			code: "PERSONAL_TX_NOT_FOUND",
			statusCode: 404,
		});
		expect(
			await prisma.personalTransaction.findUnique({
				where: { id: transaction.id },
			}),
		).toMatchObject({
			id: transaction.id,
			userId: DEV_USER_ID,
		});
	});

	it("DELETE /api/v1/me/personal-transactions/:transactionId returns 404 for a non-existent transaction", async () => {
		const response = await request(app.getHttpServer())
			.delete(
				"/api/v1/me/personal-transactions/00000000-0000-0000-0000-000000000999",
			)
			.expect(404);

		expect(response.body.error).toMatchObject({
			code: "PERSONAL_TX_NOT_FOUND",
			statusCode: 404,
		});
	});

	it("PATCH /api/v1/me/personal-transactions/:transactionId updates expense kind", async () => {
		const transaction = await createTransaction({
			type: "expense",
			expenseKind: "variable",
			amount: 100,
		});

		const response = await request(app.getHttpServer())
			.patch(`/api/v1/me/personal-transactions/${transaction.id}`)
			.send({ expenseKind: "fixed" })
			.expect(200);

		expect(response.body.data).toMatchObject({
			id: transaction.id,
			type: "expense",
			expenseKind: "fixed",
		});
	});

	it("PATCH /api/v1/me/personal-transactions/:transactionId rejects expense kind for income", async () => {
		const transaction = await createTransaction({
			type: "income",
			category: "Salario",
			amount: 100,
		});

		const response = await request(app.getHttpServer())
			.patch(`/api/v1/me/personal-transactions/${transaction.id}`)
			.send({ expenseKind: "fixed" })
			.expect(400);

		expect(response.body.error).toMatchObject({
			code: "PERSONAL_TX_EXPENSE_KIND_NOT_ALLOWED",
			statusCode: 400,
		});
	});

	it("PATCH /api/v1/me/personal-transactions/:transactionId allows setting note to null", async () => {
		const transaction = await createTransaction({
			type: "expense",
			amount: 100,
			note: "Original note",
		});

		const response = await request(app.getHttpServer())
			.patch(`/api/v1/me/personal-transactions/${transaction.id}`)
			.send({ note: null })
			.expect(200);

		expect(response.body.data.note).toBeNull();
	});

	it("PATCH /api/v1/me/personal-transactions/:transactionId returns 400 for invalid body", async () => {
		const transaction = await createTransaction({
			type: "expense",
			amount: 100,
		});

		const response = await request(app.getHttpServer())
			.patch(`/api/v1/me/personal-transactions/${transaction.id}`)
			.send({ amount: 0 })
			.expect(400);

		expect(response.body.error).toMatchObject({
			code: "VALIDATION_ERROR",
			statusCode: 400,
		});
	});

	it("PATCH /api/v1/me/personal-transactions/:transactionId returns 400 when type is not a valid enum value", async () => {
		const transaction = await createTransaction({
			type: "expense",
			amount: 100,
		});

		const response = await request(app.getHttpServer())
			.patch(`/api/v1/me/personal-transactions/${transaction.id}`)
			.send({ type: "not-a-real-type" })
			.expect(400);

		expect(response.body.error).toMatchObject({
			code: "VALIDATION_ERROR",
			statusCode: 400,
		});
	});

	it("PATCH /api/v1/me/personal-transactions/:transactionId returns 400 when note exceeds 200 characters", async () => {
		const transaction = await createTransaction({
			type: "expense",
			amount: 100,
		});

		const response = await request(app.getHttpServer())
			.patch(`/api/v1/me/personal-transactions/${transaction.id}`)
			.send({ note: "a".repeat(201) })
			.expect(400);

		expect(response.body.error).toMatchObject({
			code: "VALIDATION_ERROR",
			statusCode: 400,
		});
	});

	it("PATCH /api/v1/me/personal-transactions/:transactionId returns 401 without a valid JWT", async () => {
		const transaction = await createTransaction({
			type: "expense",
			amount: 100,
		});

		await request(app.getHttpServer())
			.patch(`/api/v1/me/personal-transactions/${transaction.id}`)
			.set("x-skip-test-auth", "1")
			.send({ amount: 250 })
			.expect(401);
	});

	it("PATCH /api/v1/me/personal-transactions/:transactionId returns 404 when the transaction does not exist", async () => {
		const response = await request(app.getHttpServer())
			.patch(
				"/api/v1/me/personal-transactions/00000000-0000-0000-0000-000000000999",
			)
			.send({ amount: 250 })
			.expect(404);

		expect(response.body.error).toMatchObject({
			code: "PERSONAL_TX_NOT_FOUND",
			statusCode: 404,
		});
	});

	it("PATCH /api/v1/me/personal-transactions/:transactionId protects transactions owned by other users", async () => {
		const otherUser = await registerAndLogin(app);
		const otherAccount = await prisma.account.findFirstOrThrow({
			where: {
				userId: otherUser.userId,
				isDefault: true,
				archivedAt: null,
			},
		});
		const foreignTransaction = await prisma.personalTransaction.create({
			data: {
				userId: otherUser.userId,
				accountId: otherAccount.id,
				type: "expense",
				expenseKind: "variable",
				amount: "999",
				currency: "ARS",
				category: "Alimentación",
				occurredAt: new Date("2026-06-29T10:00:00.000Z"),
			},
		});

		const response = await request(app.getHttpServer())
			.patch(`/api/v1/me/personal-transactions/${foreignTransaction.id}`)
			.send({ amount: 250 })
			.expect(404);

		expect(response.body.error).toMatchObject({
			code: "PERSONAL_TX_NOT_FOUND",
			statusCode: 404,
		});
	});

	it("GET /api/v1/me/personal-transactions returns 401 without a valid JWT", async () => {
		await request(app.getHttpServer())
			.get("/api/v1/me/personal-transactions")
			.set("x-skip-test-auth", "1")
			.expect(401);
	});

	it("GET /api/v1/me/personal-transactions only returns the authenticated user's transactions", async () => {
		await createTransaction({ type: "expense", amount: 100 });

		const otherUser = await registerAndLogin(app);
		const otherAccount = await prisma.account.findFirstOrThrow({
			where: {
				userId: otherUser.userId,
				isDefault: true,
				archivedAt: null,
			},
		});
		await prisma.personalTransaction.create({
			data: {
				userId: otherUser.userId,
				accountId: otherAccount.id,
				type: "expense",
				expenseKind: "variable",
				amount: "999",
				currency: "ARS",
				category: "Alimentación",
				occurredAt: new Date("2026-06-29T10:00:00.000Z"),
			},
		});

		const response = await request(app.getHttpServer())
			.get("/api/v1/me/personal-transactions")
			.set("Authorization", otherUser.authorization)
			.query({ range: "year" })
			.expect(200);

		expect(response.body.data.transactions).toHaveLength(1);
		expect(response.body.data.transactions[0]).toMatchObject({
			amount: 999,
			accountName: otherAccount.name,
		});
	});

	async function createTransaction(
		overrides: Partial<{
			type: string;
			amount: number;
			currency: string;
			expenseKind: "fixed" | "variable";
			category: string;
			occurredAt: Date;
			note: string;
		}>,
	): Promise<{ id: string }> {
		const transaction = await prisma.personalTransaction.create({
			data: {
				userId: DEV_USER_ID,
				accountId: DEV_DEFAULT_ACCOUNT_ID,
				type: overrides.type ?? "expense",
				expenseKind:
					(overrides.type ?? "expense") === "expense"
						? (overrides.expenseKind ?? "variable")
						: null,
				amount: overrides.amount ?? 100,
				currency: overrides.currency ?? "ARS",
				category: overrides.category ?? "Alimentación",
				occurredAt:
					overrides.occurredAt ?? new Date("2026-06-29T10:00:00.000Z"),
				note: overrides.note ?? null,
			},
		});

		return { id: transaction.id };
	}
});
