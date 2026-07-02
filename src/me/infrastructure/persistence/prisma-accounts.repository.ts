import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { DatabaseException } from "../../../shared/exceptions/database.exception";
import {
	AccountsRepository,
	type Account,
} from "../../domain/ports/accounts.repository";

@Injectable()
export class PrismaAccountsRepository extends AccountsRepository {
	constructor(private readonly prisma: PrismaService) {
		super();
	}

	async findByUserId(userId: string): Promise<Account[]> {
		return this.runDatabaseOperation("ACCOUNTS_LIST_DATABASE_ERROR", async () => {
			const accounts = await this.prisma.account.findMany({
				where: {
					userId,
					archivedAt: null,
				},
				orderBy: {
					createdAt: "asc",
				},
			});

			return accounts.map(mapAccount);
		});
	}

	async findDefaultByUserId(userId: string): Promise<Account | null> {
		return this.runDatabaseOperation("ACCOUNTS_LIST_DATABASE_ERROR", async () => {
			const accounts = await this.prisma.account.findMany({
				where: {
					userId,
					isDefault: true,
					archivedAt: null,
				},
				orderBy: {
					createdAt: "asc",
				},
				take: 2,
			});

			if (accounts.length === 0) {
				return null;
			}

			return mapAccount(accounts[0]);
		});
	}

	async findByIdAndUserId(
		id: string,
		userId: string,
	): Promise<Account | null> {
		return this.runDatabaseOperation("ACCOUNTS_LIST_DATABASE_ERROR", async () => {
			const account = await this.prisma.account.findFirst({
				where: {
					id,
					userId,
					archivedAt: null,
				},
			});

			return account ? mapAccount(account) : null;
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

function mapAccount(
	account: {
		id: string;
		userId: string;
		name: string;
		kind: string;
		currency: string;
		isDefault: boolean;
		archivedAt: Date | null;
		createdAt: Date;
		updatedAt: Date;
	},
): Account {
	return {
		id: account.id,
		userId: account.userId,
		name: account.name,
		kind: account.kind.toLowerCase(),
		currency: account.currency,
		isDefault: account.isDefault,
		archivedAt: account.archivedAt,
		createdAt: account.createdAt,
		updatedAt: account.updatedAt,
	};
}
