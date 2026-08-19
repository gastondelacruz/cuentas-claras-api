import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { DatabaseException } from "../../../shared/exceptions/database.exception";
import {
	PasswordResetRepository,
	type CompletePasswordResetInput,
	type PasswordResetTokenRecord,
	type ReplacePasswordResetTokenInput,
	type SavePasswordResetTokenInput,
} from "../../domain/ports/password-reset.repository";

type PasswordResetDelegate = {
	create(input: { data: SavePasswordResetTokenInput }): Promise<unknown>;
	updateMany(input: {
		where: Record<string, unknown>;
		data: Record<string, unknown>;
	}): Promise<{ count: number }>;
	findUnique(input: {
		where: { tokenDigest: string };
		select: Record<string, boolean>;
	}): Promise<PasswordResetTokenRecord | null>;
};

@Injectable()
export class PrismaPasswordResetRepository extends PasswordResetRepository {
	constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {
		super();
	}

	async save(input: SavePasswordResetTokenInput): Promise<void> {
		await this.runDatabaseOperation(
			"PASSWORD_RESET_TOKEN_CREATE_DATABASE_ERROR",
			async () => {
				await this.passwordResetTokens.create({ data: input });
			},
		);
	}

	async invalidateActiveForUser(
		userId: string,
		invalidatedAt: Date,
	): Promise<void> {
		await this.runDatabaseOperation(
			"PASSWORD_RESET_TOKEN_INVALIDATE_DATABASE_ERROR",
			async () => {
				await this.passwordResetTokens.updateMany({
					where: { userId, consumedAt: null, expiresAt: { gt: invalidatedAt } },
					data: { consumedAt: invalidatedAt },
				});
			},
		);
	}

	async replaceActiveForUser(
		input: ReplacePasswordResetTokenInput,
	): Promise<void> {
		await this.runDatabaseOperation(
			"PASSWORD_RESET_TOKEN_REPLACE_DATABASE_ERROR",
			async () => {
				await this.prisma.$transaction(async (tx) => {
					const passwordResetTokens = (
						tx as unknown as {
							passwordResetToken: PasswordResetDelegate;
						}
					).passwordResetToken;
					await passwordResetTokens.updateMany({
						where: {
							userId: input.userId,
							consumedAt: null,
							expiresAt: { gt: input.invalidatedAt },
						},
						data: { consumedAt: input.invalidatedAt },
					});
					await passwordResetTokens.create({
						data: {
							userId: input.userId,
							tokenDigest: input.tokenDigest,
							expiresAt: input.expiresAt,
						},
					});
				});
			},
		);
	}

	findByDigest(tokenDigest: string): Promise<PasswordResetTokenRecord | null> {
		return this.runDatabaseOperation(
			"PASSWORD_RESET_TOKEN_FIND_DATABASE_ERROR",
			() =>
				this.passwordResetTokens.findUnique({
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

	async complete(input: CompletePasswordResetInput): Promise<boolean> {
		return this.runDatabaseOperation(
			"PASSWORD_RESET_COMPLETE_DATABASE_ERROR",
			async () =>
				this.prisma.$transaction(async (tx) => {
					const passwordResetTokens = (
						tx as unknown as {
							passwordResetToken: PasswordResetDelegate;
						}
					).passwordResetToken;
					const consumed = await passwordResetTokens.updateMany({
						where: {
							id: input.tokenId,
							userId: input.userId,
							consumedAt: null,
							expiresAt: { gt: input.completedAt },
						},
						data: { consumedAt: input.completedAt },
					});

					if (consumed.count !== 1) {
						return false;
					}

					await tx.user.update({
						where: { id: input.userId },
						data: { passwordHash: input.passwordHash },
					});
					await tx.refreshToken.updateMany({
						where: { userId: input.userId, revokedAt: null },
						data: { revokedAt: input.completedAt },
					});

					return true;
				}),
		);
	}

	private get passwordResetTokens(): PasswordResetDelegate {
		return (
			this.prisma as unknown as { passwordResetToken: PasswordResetDelegate }
		).passwordResetToken;
	}

	private async runDatabaseOperation<T>(
		code: string,
		operation: () => Promise<T>,
	): Promise<T> {
		try {
			return await operation();
		} catch (error) {
			if (error instanceof DatabaseException) {
				throw error;
			}

			throw new DatabaseException(code);
		}
	}
}
