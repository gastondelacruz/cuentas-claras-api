import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

export const CurrentUser = createParamDecorator(
	(data: string | undefined, ctx: ExecutionContext) => {
		const request = ctx
			.switchToHttp()
			.getRequest<Request & { user?: unknown }>();
		const user = request.user;

		if (data && typeof user === "object" && user !== null && data in user) {
			return (user as Record<string, unknown>)[data];
		}

		return user;
	},
);
