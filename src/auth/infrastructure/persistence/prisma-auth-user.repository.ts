import { Inject, Injectable } from "@nestjs/common";
import type { AccountKind } from "@prisma/client";
import { PrismaService } from "../../../prisma/prisma.service";
import { BusinessException } from "../../../shared/exceptions/business.exception";
import { DatabaseException } from "../../../shared/exceptions/database.exception";
import {
	AuthUserRepository,
	type AuthGoogleLinkUser,
	type AuthLoginUser,
	type AuthUser,
	type CreateGoogleUserInput,
	type CreateUserWithPasswordInput,
	type DefaultAccountInput,
	type LinkGoogleAccountInput,
} from "../../domain/ports/auth-user.repository";
import type { SaveRefreshTokenInput } from "../../domain/ports/refresh-token.repository";

type UserCreateData = {
	name: string;
	email: string;
	passwordHash?: string;
	googleId?: string;
	avatarUrl?: string | null;
	emailVerifiedAt?: Date;
};

type AuthUserWithGoogleId = AuthGoogleLinkUser;

@Injectable()
export class PrismaAuthUserRepository extends AuthUserRepository {
	constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {
		super();
	}

	findById(id: string): Promise<AuthUser | null> {
		return this.runDatabaseOperation("AUTH_USER_FIND_DATABASE_ERROR", () =>
			this.prisma.user.findUnique({
				where: { id },
				select: this.authUserSelect(),
			}),
		);
	}

	findByEmail(email: string): Promise<AuthUser | null> {
		return this.runDatabaseOperation("AUTH_USER_FIND_DATABASE_ERROR", () =>
			this.prisma.user.findUnique({
				where: { email },
				select: this.authUserSelect(),
			}),
		);
	}

	findByGoogleId(googleId: string): Promise<AuthUser | null> {
		return this.runDatabaseOperation("AUTH_USER_FIND_DATABASE_ERROR", () =>
			this.prisma.user.findUnique({
				where: { googleId },
				select: this.authUserSelect(),
			}),
		);
	}

	findByEmailForGoogleLink(email: string): Promise<AuthGoogleLinkUser | null> {
		return this.runDatabaseOperation("AUTH_USER_FIND_DATABASE_ERROR", () =>
			this.prisma.user.findUnique({
				where: { email },
				select: this.authUserWithGoogleIdSelect(),
			}),
		);
	}

	findByEmailForLogin(email: string): Promise<AuthLoginUser | null> {
		return this.runDatabaseOperation("AUTH_USER_FIND_DATABASE_ERROR", () =>
			this.prisma.user.findUnique({
				where: { email },
				select: {
					...this.authUserSelect(),
					passwordHash: true,
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
				select: this.authUserSelect(),
			}),
		);
	}

	createUserWithDefaultAccount(
		input: CreateUserWithPasswordInput,
		defaultAccount: DefaultAccountInput,
	): Promise<AuthUser> {
		return this.runDatabaseOperation("AUTH_USER_CREATE_DATABASE_ERROR", () =>
			this.createUserAndDefaultAccount(
				{
					name: input.name,
					email: input.email,
					passwordHash: input.passwordHash,
				},
				defaultAccount,
			),
		);
	}

	async createGoogleUserWithDefaultAccount(
		input: CreateGoogleUserInput,
		defaultAccount: DefaultAccountInput,
	): Promise<AuthUser> {
		try {
			return await this.createUserAndDefaultAccount(
				{
					name: input.name,
					email: input.email,
					googleId: input.googleId,
					avatarUrl: input.avatarUrl,
					emailVerifiedAt: input.emailVerifiedAt,
				},
				defaultAccount,
			);
		} catch (error) {
			if (this.isUniqueConstraintViolation(error)) {
				return this.recoverGoogleUserCreateConflict(input);
			}

			throw this.toDatabaseException("AUTH_USER_CREATE_DATABASE_ERROR", error);
		}
	}

	async linkGoogleAccount(
		userId: string,
		input: LinkGoogleAccountInput,
	): Promise<AuthUser> {
		try {
			const result = await this.prisma.user.updateMany({
				where: {
					id: userId,
					OR: [{ googleId: null }, { googleId: input.googleId }],
				},
				data: {
					googleId: input.googleId,
					avatarUrl: input.avatarUrl,
					emailVerifiedAt: input.emailVerifiedAt,
				},
			});

			if (result.count === 0) {
				return await this.rejectUnsafeGoogleAccountLink(userId, input.googleId);
			}

			return await this.readRequiredAuthUserWithGoogleIdById(userId);
		} catch (error) {
			if (error instanceof BusinessException || error instanceof DatabaseException) {
				throw error;
			}

			if (this.isUniqueConstraintViolation(error)) {
				return this.recoverGoogleAccountLinkConflict(userId, input.googleId);
			}

			throw this.toDatabaseException("AUTH_USER_UPDATE_DATABASE_ERROR", error);
		}
	}

	async claimUnverifiedGoogleAccount(
		userId: string,
		input: LinkGoogleAccountInput,
		replacementRefreshToken: SaveRefreshTokenInput,
	): Promise<AuthUser> {
		try {
			return await this.prisma.$transaction(async (tx) => {
				const result = await tx.user.updateMany({
					where: {
						id: userId,
						emailVerifiedAt: null,
						OR: [{ googleId: null }, { googleId: input.googleId }],
					},
					data: {
						googleId: input.googleId,
						avatarUrl: input.avatarUrl,
						emailVerifiedAt: input.emailVerifiedAt,
						passwordHash: null,
					},
				});

				if (result.count === 0) {
					throw this.googleAccountLinkConflict();
				}

				await tx.refreshToken.deleteMany({ where: { userId } });
				await tx.refreshToken.create({
					data: {
						userId: replacementRefreshToken.userId,
						tokenHash: replacementRefreshToken.tokenHash,
						tokenDigest: replacementRefreshToken.tokenDigest,
						expiresAt: replacementRefreshToken.expiresAt,
					},
				});
				const user = await tx.user.findUnique({
					where: { id: userId },
					select: this.authUserWithGoogleIdSelect(),
				});

				if (!user) {
					throw new DatabaseException("AUTH_USER_FIND_DATABASE_ERROR");
				}

				return this.toAuthUser(user);
			});
		} catch (error) {
			if (error instanceof BusinessException || error instanceof DatabaseException) {
				throw error;
			}

			if (this.isUniqueConstraintViolation(error)) {
				throw this.googleAccountLinkConflict();
			}

			throw this.toDatabaseException("AUTH_USER_UPDATE_DATABASE_ERROR", error);
		}
	}

	markEmailVerified(userId: string, verifiedAt: Date): Promise<AuthUser> {
		return this.runDatabaseOperation("AUTH_USER_UPDATE_DATABASE_ERROR", () =>
			this.prisma.user.update({
				where: { id: userId },
				data: { emailVerifiedAt: verifiedAt },
				select: this.authUserSelect(),
			}),
		);
	}

	private async createUserAndDefaultAccount(
		userData: UserCreateData,
		defaultAccount: DefaultAccountInput,
	): Promise<AuthUser> {
		return this.prisma.$transaction(async (tx) => {
			const user = await tx.user.create({
				data: userData,
				select: this.authUserSelect(),
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
		});
	}

	private async recoverGoogleUserCreateConflict(
		input: CreateGoogleUserInput,
	): Promise<AuthUser> {
		const userByGoogleId = await this.readAuthUserByGoogleId(input.googleId);

		if (userByGoogleId) {
			return userByGoogleId;
		}

		const userByEmail = await this.readAuthUserWithGoogleIdByEmail(input.email);

		if (userByEmail?.googleId === input.googleId) {
			return this.toAuthUser(userByEmail);
		}

		throw new BusinessException(
			"GOOGLE_LOGIN_CONFLICT",
			"Google login could not be completed safely.",
			409,
		);
	}

	private async recoverGoogleAccountLinkConflict(
		userId: string,
		googleId: string,
	): Promise<AuthUser> {
		const userByGoogleId = await this.readAuthUserByGoogleId(googleId);

		if (userByGoogleId?.id === userId) {
			return userByGoogleId;
		}

		throw this.googleAccountLinkConflict();
	}

	private async rejectUnsafeGoogleAccountLink(
		userId: string,
		googleId: string,
	): Promise<AuthUser> {
		const user = await this.readAuthUserWithGoogleIdById(userId);

		if (user?.googleId === googleId) {
			return this.toAuthUser(user);
		}

		throw this.googleAccountLinkConflict();
	}

	private async readAuthUserByGoogleId(
		googleId: string,
	): Promise<AuthUser | null> {
		try {
			return await this.prisma.user.findUnique({
				where: { googleId },
				select: this.authUserSelect(),
			});
		} catch (error) {
			throw this.toDatabaseException("AUTH_USER_FIND_DATABASE_ERROR", error);
		}
	}

	private async readAuthUserWithGoogleIdByEmail(
		email: string,
	): Promise<AuthUserWithGoogleId | null> {
		try {
			return await this.prisma.user.findUnique({
				where: { email },
				select: this.authUserWithGoogleIdSelect(),
			});
		} catch (error) {
			throw this.toDatabaseException("AUTH_USER_FIND_DATABASE_ERROR", error);
		}
	}

	private async readAuthUserWithGoogleIdById(
		id: string,
	): Promise<AuthUserWithGoogleId | null> {
		try {
			return await this.prisma.user.findUnique({
				where: { id },
				select: this.authUserWithGoogleIdSelect(),
			});
		} catch (error) {
			throw this.toDatabaseException("AUTH_USER_FIND_DATABASE_ERROR", error);
		}
	}

	private async readRequiredAuthUserWithGoogleIdById(
		id: string,
	): Promise<AuthUser> {
		const user = await this.readAuthUserWithGoogleIdById(id);

		if (!user) {
			throw new DatabaseException("AUTH_USER_FIND_DATABASE_ERROR");
		}

		return this.toAuthUser(user);
	}

	private googleAccountLinkConflict(): BusinessException {
		return new BusinessException(
			"GOOGLE_ACCOUNT_LINK_CONFLICT",
			"Google login could not be completed safely.",
			409,
		);
	}

	private toAuthUser(user: AuthUserWithGoogleId): AuthUser {
		return {
			id: user.id,
			name: user.name,
			email: user.email,
			emailVerifiedAt: user.emailVerifiedAt,
		};
	}

	private authUserSelect(): {
		id: true;
		name: true;
		email: true;
		emailVerifiedAt: true;
	} {
		return {
			id: true,
			name: true,
			email: true,
			emailVerifiedAt: true,
		};
	}

	private authUserWithGoogleIdSelect(): {
		id: true;
		name: true;
		email: true;
		emailVerifiedAt: true;
		googleId: true;
	} {
		return {
			...this.authUserSelect(),
			googleId: true,
		};
	}

	private toPrismaAccountKind(kind: string): AccountKind {
		return kind.toUpperCase() as AccountKind;
	}

	private isUniqueConstraintViolation(error: unknown): boolean {
		return (
			typeof error === "object" &&
			error !== null &&
			"code" in error &&
			error.code === "P2002"
		);
	}

	private toDatabaseException(code: string, error: unknown): DatabaseException {
		if (error instanceof DatabaseException) {
			return error;
		}

		return new DatabaseException(code);
	}

	private async runDatabaseOperation<T>(
		code: string,
		operation: () => Promise<T>,
	): Promise<T> {
		try {
			return await operation();
		} catch (error) {
			if (error instanceof DatabaseException || error instanceof BusinessException) {
				throw error;
			}

			throw this.toDatabaseException(code, error);
		}
	}
}
