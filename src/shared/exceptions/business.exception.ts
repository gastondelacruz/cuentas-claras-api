import { ApplicationException } from "./application.exception";

export class BusinessException extends ApplicationException {
	constructor(code: string, message: string, statusCode = 400) {
		super(code, message, statusCode, "business");
	}
}
