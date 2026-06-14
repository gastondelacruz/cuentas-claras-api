import {
	type ArgumentsHost,
	BadRequestException,
	Catch,
	type ExceptionFilter,
	HttpException,
	HttpStatus,
} from "@nestjs/common";
import type { Request, Response } from "express";
import {
	ApplicationException,
	type ApplicationExceptionType,
} from "../exceptions/application.exception";

type ErrorResponse = {
	error: {
		code: string;
		message: string;
		type: ApplicationExceptionType;
		statusCode: number;
		path: string;
		timestamp: string;
	};
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
	catch(exception: unknown, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse<Response>();
		const request = ctx.getRequest<Request>();

		const payload = this.normalizeResponse(exception, request.url);

		response.status(payload.error.statusCode).json(payload);
	}

	private normalizeResponse(exception: unknown, path: string): ErrorResponse {
		if (exception instanceof ApplicationException) {
			return this.createEnvelope({
				code: exception.code,
				message: exception.message,
				type: exception.type,
				statusCode: exception.statusCode,
				path,
			});
		}

		if (exception instanceof HttpException) {
			const statusCode = exception.getStatus();
			const exceptionResponse = exception.getResponse();
			const responseBody = this.getResponseBody(exceptionResponse);
			const isValidationError = exception instanceof BadRequestException;

			return this.createEnvelope({
				code: this.normalizeCode(responseBody.code, statusCode, isValidationError),
				message: this.normalizeMessage(
					responseBody.message ?? exceptionResponse,
					exception.message,
				),
				type: this.normalizeType(statusCode, isValidationError),
				statusCode,
				path,
			});
		}

		return this.createEnvelope({
			code: "UNEXPECTED_ERROR",
			message: "Internal server error.",
			type: "unexpected",
			statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
			path,
		});
	}

	private createEnvelope(error: Omit<ErrorResponse["error"], "timestamp">) {
		return {
			error: {
				...error,
				timestamp: new Date().toISOString(),
			},
		};
	}

	private getResponseBody(
		exceptionResponse: string | object,
	): Record<string, unknown> {
		if (typeof exceptionResponse === "object" && exceptionResponse !== null) {
			return exceptionResponse as Record<string, unknown>;
		}

		return {
			message: exceptionResponse,
		};
	}

	private normalizeMessage(message: unknown, fallback: string): string {
		if (Array.isArray(message)) {
			return message.filter((item) => typeof item === "string").join("; ");
		}

		if (typeof message === "string") {
			return message;
		}

		return fallback || "HTTP error.";
	}

	private normalizeCode(
		code: unknown,
		statusCode: number,
		isValidationError: boolean,
	): string {
		if (typeof code === "string") {
			return code;
		}

		if (isValidationError) {
			return "VALIDATION_ERROR";
		}

		return `HTTP_${statusCode}`;
	}

	private normalizeType(
		statusCode: number,
		isValidationError: boolean,
	): ApplicationExceptionType {
		if (isValidationError) {
			return "validation";
		}

		return statusCode >= 500 ? "unexpected" : "business";
	}
}
