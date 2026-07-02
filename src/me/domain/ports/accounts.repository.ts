export type Account = {
	id: string;
	userId: string;
	name: string;
	kind: string;
	currency: string;
	isDefault: boolean;
	archivedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
};

export abstract class AccountsRepository {
	abstract findByUserId(userId: string): Promise<Account[]>;
	abstract findDefaultByUserId(userId: string): Promise<Account | null>;
	abstract findByIdAndUserId(
		id: string,
		userId: string,
	): Promise<Account | null>;
}
