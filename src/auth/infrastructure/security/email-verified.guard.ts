import { type CanActivate, type ExecutionContext, Inject, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { ALLOW_UNVERIFIED_KEY } from "../../../shared/decorators/allow-unverified.decorator";
import { IS_PUBLIC_KEY } from "../../../shared/decorators/public.decorator";
import { BusinessException } from "../../../shared/exceptions/business.exception";
import type { JwtRequestUser } from "./jwt.strategy";

@Injectable()
export class EmailVerifiedGuard implements CanActivate {
	constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
			context.getHandler(),
			context.getClass(),
		]);

		if (isPublic) {
			return true;
		}

		const allowUnverified = this.reflector.getAllAndOverride<boolean>(
			ALLOW_UNVERIFIED_KEY,
			[context.getHandler(), context.getClass()],
		);

		if (allowUnverified) {
			return true;
		}

		const request = context.switchToHttp().getRequest<Request & { user?: JwtRequestUser }>();

		if (request.user?.emailVerified === true) {
			return true;
		}

		const userId = request.user?.userId;

		if (!userId) {
			return true;
		}

		throw new BusinessException(
			"EMAIL_NOT_VERIFIED",
			"Email verification is required for this action.",
			403,
		);
	}
}
