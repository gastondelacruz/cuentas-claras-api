export type AuthUser = {
	id: string;
	name: string;
	email: string;
};

export type AuthLoginUser = AuthUser & { passwordHash: string | null };

export type CreateUserWithPasswordInput = {
	name: string;
	email: string;
	passwordHash: string;
};

export type DefaultAccountInput = {
	name: string;
	currency: string;
	kind: string;
};

export abstract class AuthUserRepository {
	abstract findById(id: string): Promise<AuthUser | null>;
	abstract findByEmail(email: string): Promise<AuthUser | null>;
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
}
