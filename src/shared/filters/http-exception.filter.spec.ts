import { BadRequestException, Logger, NotFoundException } from "@nestjs/common";
import { BusinessException } from "../exceptions/business.exception";
import { DatabaseException } from "../exceptions/database.exception";
import { HttpExceptionFilter } from "./http-exception.filter";

describe("HttpExceptionFilter", () => {
	let loggerErrorSpy: ReturnType<typeof vi.spyOn>;
	let loggerWarnSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		loggerErrorSpy = vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
		loggerWarnSpy = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
	});

	afterEach(() => {
		loggerErrorSpy.mockRestore();
		loggerWarnSpy.mockRestore();
	});

	it("formats business exceptions with the approved error envelope", () => {
		const { filter, response } = createFilterHarness("/api/v1/groups/missing");

		filter.catch(
			new BusinessException("GROUP_NOT_FOUND", "Group not found.", 404),
			createHost(response, "/api/v1/groups/missing"),
		);

		expect(response.status).toHaveBeenCalledWith(404);
		expect(response.json).toHaveBeenCalledWith({
			error: {
				code: "GROUP_NOT_FOUND",
				message: "Group not found.",
				type: "business",
				statusCode: 404,
				path: "/api/v1/groups/missing",
				timestamp: expect.any(String),
			},
		});
	});

	it("formats database exceptions without leaking raw errors", () => {
		const { filter, response } = createFilterHarness("/api/v1/groups");

		filter.catch(
			new DatabaseException("GROUP_LIST_DATABASE_ERROR"),
			createHost(response, "/api/v1/groups"),
		);

		expect(response.status).toHaveBeenCalledWith(500);
		expect(response.json).toHaveBeenCalledWith({
			error: {
				code: "GROUP_LIST_DATABASE_ERROR",
				message: "A database error occurred.",
				type: "database",
				statusCode: 500,
				path: "/api/v1/groups",
				timestamp: expect.any(String),
			},
		});
	});

	it("formats validation bad requests as validation errors", () => {
		const { filter, response } = createFilterHarness("/api/v1/groups");

		filter.catch(
			new BadRequestException({
				message: ["name should not be empty", "currency must be uppercase"],
				error: "Bad Request",
				statusCode: 400,
			}),
			createHost(response, "/api/v1/groups"),
		);

		expect(response.status).toHaveBeenCalledWith(400);
		expect(response.json).toHaveBeenCalledWith({
			error: {
				code: "VALIDATION_ERROR",
				message: "name should not be empty; currency must be uppercase",
				type: "validation",
				statusCode: 400,
				path: "/api/v1/groups",
				timestamp: expect.any(String),
			},
		});
	});

	it("formats other HTTP exceptions with stable fallback codes", () => {
		const { filter, response } = createFilterHarness("/api/v1/unknown");

		filter.catch(
			new NotFoundException("Route not found"),
			createHost(response, "/api/v1/unknown"),
		);

		expect(response.status).toHaveBeenCalledWith(404);
		expect(response.json).toHaveBeenCalledWith({
			error: {
				code: "HTTP_404",
				message: "Route not found",
				type: "business",
				statusCode: 404,
				path: "/api/v1/unknown",
				timestamp: expect.any(String),
			},
		});
	});

	it("formats unknown errors with a safe unexpected message", () => {
		const { filter, response } = createFilterHarness("/api/v1/groups");

		filter.catch(
			new Error("raw secret database failure"),
			createHost(response, "/api/v1/groups"),
		);

		expect(response.status).toHaveBeenCalledWith(500);
		expect(response.json).toHaveBeenCalledWith({
			error: {
				code: "UNEXPECTED_ERROR",
				message: "Internal server error.",
				type: "unexpected",
				statusCode: 500,
				path: "/api/v1/groups",
				timestamp: expect.any(String),
			},
		});
	});

	it("logs handled HTTP endpoint errors without changing the response envelope", () => {
		const { filter, response } = createFilterHarness("/api/v1/groups", "production");

		filter.catch(
			new BadRequestException({
				message: ["name should not be empty"],
				error: "Bad Request",
				statusCode: 400,
			}),
			createHost(response, "/api/v1/groups", "POST"),
		);

		expect(loggerWarnSpy).toHaveBeenCalledWith(
			"POST /api/v1/groups -> 400 VALIDATION_ERROR: name should not be empty",
			expect.any(String),
		);
		expect(loggerErrorSpy).not.toHaveBeenCalled();
		expect(response.status).toHaveBeenCalledWith(400);
	});

	it("logs unexpected endpoint errors with stack traces", () => {
		const { filter, response } = createFilterHarness("/api/v1/groups", "production");
		const exception = new Error("raw secret database failure");

		filter.catch(exception, createHost(response, "/api/v1/groups", "GET"));

		expect(loggerErrorSpy).toHaveBeenCalledWith(
			"GET /api/v1/groups -> 500 UNEXPECTED_ERROR: Internal server error.",
			exception.stack,
		);
		expect(loggerWarnSpy).not.toHaveBeenCalled();
		expect(response.status).toHaveBeenCalledWith(500);
	});

	it("logs sanitized request bodies in development", () => {
		const { filter, response } = createFilterHarness("/api/v1/auth/register", "development");

		filter.catch(
			new BadRequestException({
				message: ["email must be an email"],
				error: "Bad Request",
				statusCode: 400,
			}),
			createHost(response, "/api/v1/auth/register", "POST", {
				email: "invalid-email",
				password: "secret-password",
				profile: {
					refreshToken: "refresh-token-value",
				},
			}),
		);

		expect(loggerWarnSpy).toHaveBeenCalledWith(
			'POST /api/v1/auth/register -> 400 VALIDATION_ERROR: email must be an email body={"email":"invalid-email","password":"[redacted]","profile":{"refreshToken":"[redacted]"}}',
			expect.any(String),
		);
	});

	it("does not log request bodies outside development", () => {
		const { filter, response } = createFilterHarness("/api/v1/auth/register", "production");

		filter.catch(
			new BadRequestException({
				message: ["email must be an email"],
				error: "Bad Request",
				statusCode: 400,
			}),
			createHost(response, "/api/v1/auth/register", "POST", {
				email: "invalid-email",
				password: "secret-password",
			}),
		);

		expect(loggerWarnSpy).toHaveBeenCalledWith(
			"POST /api/v1/auth/register -> 400 VALIDATION_ERROR: email must be an email",
			expect.any(String),
		);
	});
});

function createFilterHarness(path: string, nodeEnv = "production") {
	const filter = new HttpExceptionFilter(nodeEnv);
	const response = createResponse();

	return {
		filter,
		response,
		host: createHost(response, path),
	};
}

function createResponse() {
	return {
		status: vi.fn().mockReturnThis(),
		json: vi.fn(),
	};
}

function createHost(
	response: ReturnType<typeof createResponse>,
	path: string,
	method = "GET",
	body?: unknown,
) {
	return {
		switchToHttp: () => ({
			getResponse: () => response,
			getRequest: () => ({ body, method, url: path }),
		}),
	};
}
