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

describe("Accounts endpoint (e2e)", () => {
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

		execSync("npx prisma migrate deploy", {
			cwd: process.cwd(),
			env: process.env,
			stdio: "inherit",
		});

		execSync("npx prisma db seed", {
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

	it("GET /api/v1/me/accounts returns the dev user's non-archived accounts", async () => {
		const response = await request(app.getHttpServer())
			.get("/api/v1/me/accounts")
			.expect(200);

		expect(response.body).toEqual({
			data: {
				accounts: [
					{
						id: "00000000-0000-0000-0000-000000000002",
						name: "Cuenta principal",
						kind: "bank",
						currency: "ARS",
						isDefault: true,
					},
				],
			},
		});
	});

	it("GET /api/v1/me/accounts returns the auto-created default account after registration", async () => {
		const otherUser = await registerAndLogin(app);

		const response = await request(app.getHttpServer())
			.get("/api/v1/me/accounts")
			.set("Authorization", otherUser.authorization)
			.expect(200);

		expect(response.body.data.accounts).toHaveLength(1);
		expect(response.body.data.accounts[0]).toMatchObject({
			name: "Cuenta principal",
			kind: "cash",
			currency: "ARS",
			isDefault: true,
		});
		expect(response.body.data.accounts[0].id).not.toBe(
			"00000000-0000-0000-0000-000000000002",
		);
	});

	it("GET /api/v1/me/accounts excludes archived accounts", async () => {
		await prisma.account.create({
			data: {
				userId: DEV_USER_ID,
				name: "Archived account",
				kind: "CREDIT",
				currency: "ARS",
				isDefault: false,
				archivedAt: new Date("2026-01-01T00:00:00.000Z"),
			},
		});

		const response = await request(app.getHttpServer())
			.get("/api/v1/me/accounts")
			.expect(200);

		expect(response.body.data.accounts).toHaveLength(1);
		expect(response.body.data.accounts[0].name).toBe("Cuenta principal");
	});
});
