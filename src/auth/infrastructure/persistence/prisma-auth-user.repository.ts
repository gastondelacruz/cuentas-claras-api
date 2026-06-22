import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { DatabaseException } from "../../../shared/exceptions/database.exception";
import {
	AuthUserRepository,
	type AuthUser,
	type CreateUserWithPasswordInput,
} from "../../domain/ports/auth-user.repository";

@Injectable()
export class PrismaAuthUserRepository extends AuthUserRepository {
	constructor(private readonly prisma: PrismaService) {
		super();
	}

	findByEmail(email: string): Promise<AuthUser | null> {
		return this.runDatabaseOperation("AUTH_USER_FIND_DATABASE_ERROR", () =>
			this.prisma.user.findUnique({
				where: {
					email,
				},
				select: {
					id: true,
					name: true,
					email: true,
				},
			}),
		);
	}

	createWithPassword(input: CreateUserWithPasswordInput): Promise<AuthUser> {
		return this.runDatabaseOperation("AUTH_USER_CREATE_DATABASE_ERROR", () =>
			this.prisma.user.create({
				data: {
					name: input.name,
					email: input.email,
					passwordHash: input.passwordHash,
				},
				select: {
					id: true,
					name: true,
					email: true,
				},
			}),
		);
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
