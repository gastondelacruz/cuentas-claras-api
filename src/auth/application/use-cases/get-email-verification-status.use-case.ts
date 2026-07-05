import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../../shared/exceptions/business.exception";
import { AuthUserRepository } from "../../domain/ports/auth-user.repository";

export type EmailVerificationStatus = {
	verified: boolean;
	verifiedAt: Date | null;
};

@Injectable()
export class GetEmailVerificationStatusUseCase {
	constructor(private readonly users: AuthUserRepository) {}

	async execute(userId: string): Promise<EmailVerificationStatus> {
		const user = await this.users.findById(userId);

		if (!user) {
			throw new BusinessException("AUTH_USER_NOT_FOUND", "User not found.", 404);
		}

		return {
			verified: user.emailVerifiedAt !== null && user.emailVerifiedAt !== undefined,
			verifiedAt: user.emailVerifiedAt ?? null,
		};
	}
}
