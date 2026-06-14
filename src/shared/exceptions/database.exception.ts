import { ApplicationException } from "./application.exception";

export class DatabaseException extends ApplicationException {
	constructor(
		code: string,
		message = "A database error occurred.",
		statusCode = 500,
	) {
		super(code, message, statusCode, "database");
	}
}
