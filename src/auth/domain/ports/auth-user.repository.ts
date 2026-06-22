export type AuthUser = {
	id: string;
	name: string;
	email: string;
};

export type CreateUserWithPasswordInput = {
	name: string;
	email: string;
	passwordHash: string;
};

export abstract class AuthUserRepository {
	abstract findByEmail(email: string): Promise<AuthUser | null>;
	abstract createWithPassword(
		input: CreateUserWithPasswordInput,
	): Promise<AuthUser>;
}
