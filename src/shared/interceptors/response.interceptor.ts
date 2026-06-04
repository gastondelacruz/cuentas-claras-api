import {
	type CallHandler,
	type ExecutionContext,
	Injectable,
	type NestInterceptor,
} from "@nestjs/common";
import { map, type Observable } from "rxjs";

type ResponseEnvelope<T> = {
	data: T;
	meta?: unknown;
};

@Injectable()
export class ResponseInterceptor<T>
	implements NestInterceptor<T, ResponseEnvelope<T>>
{
	intercept(
		_context: ExecutionContext,
		next: CallHandler<T>,
	): Observable<ResponseEnvelope<T>> {
		return next.handle().pipe(map((body) => this.wrap(body)));
	}

	private wrap(body: T): ResponseEnvelope<T> {
		if (this.hasDataEnvelope(body)) {
			return body as ResponseEnvelope<T>;
		}

		return { data: body };
	}

	private hasDataEnvelope(body: T): boolean {
		return (
			typeof body === "object" &&
			body !== null &&
			"data" in body &&
			!Array.isArray(body)
		);
	}
}
