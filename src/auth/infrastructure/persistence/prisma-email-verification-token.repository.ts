import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { DatabaseException } from "../../../shared/exceptions/database.exception";
import {
	EmailVerificationTokenRepository,
	type EmailVerificationTokenRecord,
	type SaveEmailVerificationTokenInput,
} from "../../domain/ports/email-verification-token.repository";

@Injectable()
export class PrismaEmailVerificationTokenRepository extends EmailVerificationTokenRepository {
	constructor(private readonly prisma: PrismaService) {
		super();
	}

	async save(input: SaveEmailVerificationTokenInput): Promise<void> {
		await this.runDatabaseOperation("EMAIL_VERIFICATION_TOKEN_CREATE_DATABASE_ERROR", async () => {
			await this.prisma.emailVerificationToken.create({ data: input });
		});
	}

	async invalidateActiveForUser(userId: string, invalidatedAt: Date): Promise<void> {
		await this.runDatabaseOperation("EMAIL_VERIFICATION_TOKEN_INVALIDATE_DATABASE_ERROR", async () => {
			await this.prisma.emailVerificationToken.updateMany({
				where: {
					userId,
					consumedAt: null,
					expiresAt: {
						gt: invalidatedAt,
					},
				},
				data: { consumedAt: invalidatedAt },
			});
		});
	}

	findByDigest(tokenDigest: string): Promise<EmailVerificationTokenRecord | null> {
		return this.runDatabaseOperation("EMAIL_VERIFICATION_TOKEN_FIND_DATABASE_ERROR", () =>
			this.prisma.emailVerificationToken.findUnique({
				where: { tokenDigest },
				select: {
					id: true,
					userId: true,
					tokenDigest: true,
					expiresAt: true,
					consumedAt: true,
				},
			}),
		);
	}

	async consume(id: string, consumedAt: Date): Promise<boolean> {
		return this.runDatabaseOperation("EMAIL_VERIFICATION_TOKEN_CONSUME_DATABASE_ERROR", async () => {
			const consumed = await this.prisma.emailVerificationToken.updateMany({
				where: {
					id,
					consumedAt: null,
				},
				data: { consumedAt },
			});

			return consumed.count === 1;
		});
	}

	private async runDatabaseOperation<T>(code: string, operation: () => Promise<T>): Promise<T> {
		try {
			return await operation();
		} catch {
			throw new DatabaseException(code);
		}
	}
}
