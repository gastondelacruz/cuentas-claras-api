import { Injectable } from "@nestjs/common";
import { AccountKind } from "@prisma/client";
import { PrismaService } from "../../../prisma/prisma.service";
import { DatabaseException } from "../../../shared/exceptions/database.exception";
import {
	AuthUserRepository,
	type AuthLoginUser,
	type AuthUser,
	type CreateUserWithPasswordInput,
	type DefaultAccountInput,
} from "../../domain/ports/auth-user.repository";

@Injectable()
export class PrismaAuthUserRepository extends AuthUserRepository {
	constructor(private readonly prisma: PrismaService) {
		super();
	}

	findById(id: string): Promise<AuthUser | null> {
		return this.runDatabaseOperation("AUTH_USER_FIND_DATABASE_ERROR", () =>
			this.prisma.user.findUnique({
				where: { id },
					select: {
						id: true,
						name: true,
						email: true,
						emailVerifiedAt: true,
					},
				}),
			);
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
						emailVerifiedAt: true,
					},
				}),
			);
		}

	findByEmailForLogin(email: string): Promise<AuthLoginUser | null> {
		return this.runDatabaseOperation("AUTH_USER_FIND_DATABASE_ERROR", () =>
			this.prisma.user.findUnique({
				where: { email },
					select: {
						id: true,
						name: true,
						email: true,
						passwordHash: true,
						emailVerifiedAt: true,
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
						emailVerifiedAt: true,
					},
				}),
			);
		}

	createUserWithDefaultAccount(
		input: CreateUserWithPasswordInput,
		defaultAccount: DefaultAccountInput,
	): Promise<AuthUser> {
		return this.runDatabaseOperation("AUTH_USER_CREATE_DATABASE_ERROR", () =>
			this.prisma.$transaction(async (tx) => {
				const user = await tx.user.create({
					data: {
						name: input.name,
						email: input.email,
						passwordHash: input.passwordHash,
					},
						select: {
							id: true,
							name: true,
							email: true,
							emailVerifiedAt: true,
						},
					});

				await tx.account.create({
					data: {
						userId: user.id,
						name: defaultAccount.name,
						currency: defaultAccount.currency,
						kind: this.toPrismaAccountKind(defaultAccount.kind),
						isDefault: true,
					},
				});

				return user;
			}),
		);
	}

	markEmailVerified(userId: string, verifiedAt: Date): Promise<AuthUser> {
		return this.runDatabaseOperation("AUTH_USER_UPDATE_DATABASE_ERROR", () =>
			this.prisma.user.update({
				where: { id: userId },
				data: { emailVerifiedAt: verifiedAt },
				select: {
					id: true,
					name: true,
					email: true,
					emailVerifiedAt: true,
				},
			}),
		);
	}

	private toPrismaAccountKind(kind: string): AccountKind {
		return kind.toUpperCase() as AccountKind;
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
