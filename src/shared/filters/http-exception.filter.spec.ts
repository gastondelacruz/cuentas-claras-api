import { BadRequestException, NotFoundException } from "@nestjs/common";
import { BusinessException } from "../exceptions/business.exception";
import { DatabaseException } from "../exceptions/database.exception";
import { HttpExceptionFilter } from "./http-exception.filter";

describe("HttpExceptionFilter", () => {
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
});

function createFilterHarness(path: string) {
	const filter = new HttpExceptionFilter();
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

function createHost(response: ReturnType<typeof createResponse>, path: string) {
	return {
		switchToHttp: () => ({
			getResponse: () => response,
			getRequest: () => ({ url: path }),
		}),
	};
}
