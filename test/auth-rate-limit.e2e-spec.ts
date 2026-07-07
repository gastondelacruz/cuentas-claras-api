import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import request from "supertest";
import { vi } from "vitest";
import { HttpExceptionFilter } from "../src/shared/filters/http-exception.filter";
import { ResponseInterceptor } from "../src/shared/interceptors/response.interceptor";

describe("Auth rate limiting (e2e)", () => {
	let app: INestApplication;
	const loginUseCase = {
		execute: vi.fn().mockResolvedValue({
			accessToken: "access-token",
			refreshToken: "refresh-token",
			user: {
				id: "user-id",
				name: "Rate Limited User",
				email: "rate-limit@example.com",
			},
		}),
	};

	beforeAll(async () => {
		process.env.NODE_ENV = "test";
		process.env.DATABASE_URL =
			"postgresql://postgres:postgres@localhost:5432/cuentas_claras_test";
		process.env.JWT_ACCESS_SECRET = "test-access-secret-with-at-least-32-chars";
		process.env.JWT_REFRESH_SECRET =
			"test-refresh-secret-with-at-least-32-chars";
		process.env.REFRESH_TOKEN_DIGEST_SECRET =
			"test-digest-secret-with-at-least-32-chars";
		process.env.THROTTLE_DEFAULT_LIMIT = "2";
		process.env.THROTTLE_DEFAULT_TTL = "60000";
		process.env.THROTTLE_AUTH_LIMIT = "2";
		process.env.THROTTLE_AUTH_TTL = "60000";

		vi.resetModules();
		const [{ AppModule }, { LoginUseCase }] = await Promise.all([
			import("../src/app.module"),
			import("../src/auth/application/use-cases/login.use-case"),
		]);

		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule],
		})
			.overrideProvider(LoginUseCase)
			.useValue(loginUseCase)
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
	});

	beforeEach(() => {
		loginUseCase.execute.mockClear();
	});

	it("does not throttle health checks", async () => {
		await request(app.getHttpServer()).get("/health").expect(200);
		await request(app.getHttpServer()).get("/health").expect(200);
		await request(app.getHttpServer()).get("/health").expect(200);
	});

	it("returns 429 after the configured auth attempts are exhausted", async () => {
		const payload = {
			email: "rate-limit@example.com",
			password: "SecureP4ss!",
		};

		for (let attempt = 0; attempt < 2; attempt += 1) {
			await request(app.getHttpServer())
				.post("/api/v1/auth/login")
				.send(payload)
				.expect(200);
		}

		const response = await request(app.getHttpServer())
			.post("/api/v1/auth/login")
			.send(payload)
			.expect(429);

		expect(response.body.error).toMatchObject({
			code: "HTTP_429",
			statusCode: 429,
			type: "business",
		});
		expect(loginUseCase.execute).toHaveBeenCalledTimes(2);
	});
});
