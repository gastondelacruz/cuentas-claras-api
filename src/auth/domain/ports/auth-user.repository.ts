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

export abstract class AuthUserRepository {
	abstract findById(id: string): Promise<AuthUser | null>;
	abstract findByEmail(email: string): Promise<AuthUser | null>;
	abstract findByEmailForLogin(email: string): Promise<AuthLoginUser | null>;
	abstract createWithPassword(
		input: CreateUserWithPasswordInput,
	): Promise<AuthUser>;
}
