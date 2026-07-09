import type { SaveRefreshTokenInput } from "./refresh-token.repository";

export type AuthUser = {
	id: string;
	name: string;
	email: string;
	emailVerifiedAt?: Date | null;
};

export type AuthLoginUser = AuthUser & { passwordHash: string | null };

export type AuthGoogleLinkUser = AuthUser & { googleId: string | null };

export type CreateUserWithPasswordInput = {
	name: string;
	email: string;
	passwordHash: string;
};

export type CreateGoogleUserInput = {
	name: string;
	email: string;
	googleId: string;
	avatarUrl: string | null;
	emailVerifiedAt: Date;
};

export type LinkGoogleAccountInput = {
	googleId: string;
	avatarUrl: string | null;
	emailVerifiedAt: Date;
};

export type DefaultAccountInput = {
	name: string;
	currency: string;
	kind: string;
};

export abstract class AuthUserRepository {
	abstract findById(id: string): Promise<AuthUser | null>;
	abstract findByEmail(email: string): Promise<AuthUser | null>;
	abstract findByGoogleId(googleId: string): Promise<AuthUser | null>;
	abstract findByEmailForGoogleLink(
		email: string,
	): Promise<AuthGoogleLinkUser | null>;
	abstract findByEmailForLogin(email: string): Promise<AuthLoginUser | null>;
	/**
	 * @deprecated Use {@link createUserWithDefaultAccount} for new registrations.
	 */
	abstract createWithPassword(
		input: CreateUserWithPasswordInput,
	): Promise<AuthUser>;
	abstract createUserWithDefaultAccount(
		input: CreateUserWithPasswordInput,
		defaultAccount: DefaultAccountInput,
	): Promise<AuthUser>;
	abstract createGoogleUserWithDefaultAccount(
		input: CreateGoogleUserInput,
		defaultAccount: DefaultAccountInput,
	): Promise<AuthUser>;
	abstract linkGoogleAccount(
		userId: string,
		input: LinkGoogleAccountInput,
	): Promise<AuthUser>;
	abstract claimUnverifiedGoogleAccount(
		userId: string,
		input: LinkGoogleAccountInput,
		replacementRefreshToken: SaveRefreshTokenInput,
	): Promise<AuthUser>;
	abstract markEmailVerified(
		userId: string,
		verifiedAt: Date,
	): Promise<AuthUser>;
}
