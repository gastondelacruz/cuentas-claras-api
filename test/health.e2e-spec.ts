import { ValidationPipe, type INestApplication } from "@nestjs/common";
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

describe("Health endpoint (e2e)", () => {
	let app: INestApplication;
	let postgresContainer: StartedPostgreSqlContainer;

	beforeAll(async () => {
		postgresContainer = await new PostgreSqlContainer(
			"postgres:17-alpine",
		)
			.withDatabase("cuentas_claras_test")
			.withUsername("postgres")
			.withPassword("postgres")
			.start();

		process.env.DATABASE_URL = postgresContainer.getConnectionUri();
		process.env.NODE_ENV = "test";

		execSync("npx prisma db push", {
			cwd: process.cwd(),
			env: process.env,
			stdio: "inherit",
		});

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

		if (postgresContainer) {
			await postgresContainer.stop();
		}
	});

	it("GET /health returns ok status", async () => {
		const response = await request(app.getHttpServer()).get("/health").expect(200);

		expect(response.body).toEqual({
			data: {
				status: "ok",
				uptime: expect.any(Number),
			},
		});
	});
});
