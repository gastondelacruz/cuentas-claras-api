import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { DatabaseException } from "../../../shared/exceptions/database.exception";
import {
	RefreshTokenRepository,
	type RefreshToken,
	type SaveRefreshTokenInput,
} from "../../domain/ports/refresh-token.repository";

@Injectable()
export class PrismaRefreshTokenRepository extends RefreshTokenRepository {
	constructor(private readonly prisma: PrismaService) {
		super();
	}

	async save(input: SaveRefreshTokenInput): Promise<void> {
		await this.runDatabaseOperation("REFRESH_TOKEN_SAVE_DATABASE_ERROR", async () => {
			await this.prisma.refreshToken.create({
				data: {
					userId: input.userId,
					tokenHash: input.tokenHash,
					tokenDigest: input.tokenDigest,
					expiresAt: input.expiresAt,
				},
			});
		});
	}

	async findActiveByUserId(userId: string): Promise<RefreshToken[]> {
		return this.runDatabaseOperation("REFRESH_TOKEN_FIND_DATABASE_ERROR", async () => {
			const now = new Date();
			const rows = await this.prisma.refreshToken.findMany({
				where: {
					userId,
					revokedAt: null,
					expiresAt: { gt: now },
				},
			});
			return rows.map((row) => ({
				id: row.id,
				userId: row.userId,
				tokenHash: row.tokenHash,
				tokenDigest: row.tokenDigest,
				expiresAt: row.expiresAt,
				revokedAt: row.revokedAt,
			}));
		});
	}

	async findByDigest(digest: string): Promise<RefreshToken | null> {
		return this.runDatabaseOperation("REFRESH_TOKEN_FIND_DATABASE_ERROR", async () => {
			const row = await this.prisma.refreshToken.findUnique({
				where: { tokenDigest: digest },
			});
			if (!row) return null;
			return {
				id: row.id,
				userId: row.userId,
				tokenHash: row.tokenHash,
				tokenDigest: row.tokenDigest,
				expiresAt: row.expiresAt,
				revokedAt: row.revokedAt,
			};
		});
	}

	async revoke(id: string): Promise<void> {
		await this.runDatabaseOperation("REFRESH_TOKEN_REVOKE_DATABASE_ERROR", async () => {
			await this.prisma.refreshToken.update({
				where: { id },
				data: { revokedAt: new Date() },
			});
		});
	}

	async revokeAllByUserId(userId: string): Promise<void> {
		await this.runDatabaseOperation("REFRESH_TOKEN_REVOKE_ALL_DATABASE_ERROR", async () => {
			await this.prisma.refreshToken.updateMany({
				where: { userId, revokedAt: null },
				data: { revokedAt: new Date() },
			});
		});
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
