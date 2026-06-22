import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { DatabaseException } from "../../../shared/exceptions/database.exception";
import {
	RefreshTokenRepository,
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
					expiresAt: input.expiresAt,
				},
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
