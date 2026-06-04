import {
	type ArgumentsHost,
	Catch,
	type ExceptionFilter,
	HttpException,
	HttpStatus,
} from "@nestjs/common";
import type { Request, Response } from "express";

type ErrorResponse = {
	statusCode: number;
	message: string | string[];
	error: string;
	timestamp: string;
	path: string;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
	catch(exception: unknown, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse<Response>();
		const request = ctx.getRequest<Request>();

		const statusCode =
			exception instanceof HttpException
				? exception.getStatus()
				: HttpStatus.INTERNAL_SERVER_ERROR;

		const exceptionResponse =
			exception instanceof HttpException ? exception.getResponse() : null;

		const payload = this.normalizeResponse(
			exceptionResponse,
			statusCode,
			request.url,
		);

		response.status(statusCode).json(payload);
	}

	private normalizeResponse(
		exceptionResponse: string | object | null,
		statusCode: number,
		path: string,
	): ErrorResponse {
		if (typeof exceptionResponse === "object" && exceptionResponse !== null) {
			const responseBody = exceptionResponse as Record<string, unknown>;

			return {
				statusCode,
				message: this.normalizeMessage(responseBody.message),
				error: this.normalizeError(responseBody.error, statusCode),
				timestamp: new Date().toISOString(),
				path,
			};
		}

		return {
			statusCode,
			message:
				typeof exceptionResponse === "string"
					? exceptionResponse
					: "Internal server error",
			error: this.normalizeError(null, statusCode),
			timestamp: new Date().toISOString(),
			path,
		};
	}

	private normalizeMessage(message: unknown): string | string[] {
		if (
			Array.isArray(message) &&
			message.every((item) => typeof item === "string")
		) {
			return message;
		}

		if (typeof message === "string") {
			return message;
		}

		return "Internal server error";
	}

	private normalizeError(error: unknown, statusCode: number): string {
		if (typeof error === "string") {
			return error;
		}

		return HttpStatus[statusCode] ?? "Error";
	}
}
