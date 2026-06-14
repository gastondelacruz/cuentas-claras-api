export type ApplicationExceptionType =
	| "business"
	| "database"
	| "validation"
	| "unexpected";

export abstract class ApplicationException extends Error {
	constructor(
		readonly code: string,
		message: string,
		readonly statusCode: number,
		readonly type: ApplicationExceptionType,
	) {
		super(message);
		this.name = new.target.name;
	}
}
