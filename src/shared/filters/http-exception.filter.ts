import {
	type ArgumentsHost,
	BadRequestException,
	Catch,
	type ExceptionFilter,
	HttpException,
	HttpStatus,
	Logger,
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

const SENSITIVE_BODY_KEYS = new Set([
	"accesstoken",
	"authorization",
	"password",
	"refreshtoken",
	"token",
]);

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
	private readonly logger = new Logger(HttpExceptionFilter.name);
	private readonly nodeEnv: string;

	constructor(nodeEnv = process.env.NODE_ENV ?? "development") {
		this.nodeEnv = nodeEnv;
	}

	catch(exception: unknown, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse<Response>();
		const request = ctx.getRequest<Request>();

		const payload = this.normalizeResponse(exception, request.url);
		this.logException(exception, request, payload);

		response.status(payload.error.statusCode).json(payload);
	}

	private logException(
		exception: unknown,
		request: Request,
		payload: ErrorResponse,
	): void {
		const { error } = payload;
		const message = this.createLogMessage(request, payload);
		const stack = exception instanceof Error ? exception.stack : undefined;

		if (error.statusCode >= 500) {
			this.logger.error(message, stack);
			return;
		}

		this.logger.warn(message, stack);
	}

	private createLogMessage(request: Request, payload: ErrorResponse): string {
		const { error } = payload;
		const baseMessage = `${request.method} ${request.url} -> ${error.statusCode} ${error.code}: ${error.message}`;

		if (this.nodeEnv !== "development") {
			return baseMessage;
		}

		return `${baseMessage} body=${this.stringifyBody(request.body)}`;
	}

	private stringifyBody(body: unknown): string {
		if (body === undefined) {
			return "undefined";
		}

		try {
			return JSON.stringify(this.sanitizeBody(body));
		} catch {
			return "[unserializable]";
		}
	}

	private sanitizeBody(value: unknown): unknown {
		if (Array.isArray(value)) {
			return value.map((item) => this.sanitizeBody(item));
		}

		if (typeof value !== "object" || value === null) {
			return value;
		}

		return Object.fromEntries(
			Object.entries(value).map(([key, item]) => [
				key,
				SENSITIVE_BODY_KEYS.has(key.toLowerCase())
					? "[redacted]"
					: this.sanitizeBody(item),
			]),
		);
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
