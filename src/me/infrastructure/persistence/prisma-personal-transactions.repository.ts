import { Injectable } from "@nestjs/common";
// biome-ignore lint/style/useImportType: Nest uses this service as a runtime DI token.
import { PrismaService } from "../../../prisma/prisma.service";
import { DatabaseException } from "../../../shared/exceptions/database.exception";
import type { TransactionExpenseKind } from "../../domain/value-objects/transaction-expense-kind.vo";
import {
	type CreatePersonalTransactionInput,
	type FindFilteredPersonalTransactionsResult,
	PersonalTransactionsRepository,
	type PersonalTransaction,
	type PersonalTransactionFilters,
	type PersonalTransactionsSummary,
	type PersonalTransactionsSummaryFilters,
	type UpdatePersonalTransactionData,
} from "../../domain/ports/personal-transactions.repository";

@Injectable()
export class PrismaPersonalTransactionsRepository extends PersonalTransactionsRepository {
	constructor(private readonly prisma: PrismaService) {
		super();
	}

	async findByIdAndUserId(
		id: string,
		userId: string,
	): Promise<PersonalTransaction | null> {
		return this.runDatabaseOperation(
			"PERSONAL_TX_FIND_DATABASE_ERROR",
			async () => {
				const transaction = await this.prisma.personalTransaction.findFirst({
					include: transactionInclude,
					where: {
						id,
						userId,
					},
				});

				return transaction ? mapTransaction(transaction) : null;
			},
		);
	}

	async findFiltered(
		filters: PersonalTransactionFilters,
	): Promise<FindFilteredPersonalTransactionsResult> {
		return this.runDatabaseOperation(
			"PERSONAL_TX_LIST_DATABASE_ERROR",
			async () => {
				const take = filters.limit + 1;
				const rows = await this.prisma.personalTransaction.findMany({
					include: transactionInclude,
					where: {
						userId: filters.userId,
						...(filters.type ? { type: filters.type } : {}),
						...(filters.dateFrom || filters.dateTo
							? {
									occurredAt: {
										...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
										...(filters.dateTo ? { lt: filters.dateTo } : {}),
									},
								}
							: {}),
					},
					orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
					...(filters.cursor
						? {
								skip: 1,
								cursor: { id: filters.cursor },
							}
						: {}),
					take,
				});

				const hasNextPage = rows.length > filters.limit;
				const items = hasNextPage ? rows.slice(0, filters.limit) : rows;
				const nextCursor = hasNextPage ? items[items.length - 1].id : null;

				return {
					items: items.map(mapTransaction),
					nextCursor,
				};
			},
		);
	}

	async create(
		data: CreatePersonalTransactionInput,
	): Promise<PersonalTransaction> {
		return this.runDatabaseOperation(
			"PERSONAL_TX_CREATE_DATABASE_ERROR",
			async () => {
				const transaction = await this.prisma.personalTransaction.create({
					data: {
						userId: data.userId,
						accountId: data.accountId,
						type: data.type,
						expenseKind: data.expenseKind,
						amount: data.amount,
						currency: data.currency,
						category: data.category,
						occurredAt: data.occurredAt,
						note: data.note ?? null,
					},
					include: transactionInclude,
				});

				return mapTransaction(transaction);
			},
		);
	}

	async update(
		id: string,
		userId: string,
		data: UpdatePersonalTransactionData,
	): Promise<PersonalTransaction | null> {
		return this.runDatabaseOperation(
			"PERSONAL_TX_UPDATE_DATABASE_ERROR",
			async () => {
				const result = await this.prisma.personalTransaction.updateMany({
					where: { id, userId },
					data,
				});

				if (result.count === 0) {
					return null;
				}

				const transaction =
					await this.prisma.personalTransaction.findUniqueOrThrow({
						where: { id },
						include: transactionInclude,
					});

				return mapTransaction(transaction);
			},
		);
	}

	async getSummary(
		filters: PersonalTransactionsSummaryFilters,
	): Promise<PersonalTransactionsSummary> {
		return this.runDatabaseOperation(
			"PERSONAL_TX_SUMMARY_DATABASE_ERROR",
			async () => {
				const rows = await this.prisma.personalTransaction.groupBy({
					by: ["type", "category"],
					_sum: {
						amount: true,
					},
					where: buildSummaryWhere(filters),
				});

				const breakdown = rows
					.map((row) => ({
						category: row.category,
						type: row.type,
						amount: toNumber(row._sum.amount ?? 0),
					}))
					.sort((left, right) => {
						const typeComparison = left.type.localeCompare(right.type);

						if (typeComparison !== 0) {
							return typeComparison;
						}

						return left.category.localeCompare(right.category);
					});

				return {
					incomeTotal: sumByType(breakdown, "income"),
					expenseTotal: sumByType(breakdown, "expense"),
					breakdown,
				};
			},
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

function buildSummaryWhere(filters: PersonalTransactionsSummaryFilters) {
	return {
		userId: filters.userId,
		...(filters.dateFrom || filters.dateTo
			? {
					occurredAt: {
						...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
						...(filters.dateTo ? { lt: filters.dateTo } : {}),
					},
				}
			: {}),
	};
}

function sumByType(
	breakdown: PersonalTransactionsSummary["breakdown"],
	type: string,
): number {
	return (
		breakdown
			.filter((item) => item.type === type)
			.reduce((total, item) => total + toCents(item.amount), 0) / 100
	);
}

function toCents(amount: number): number {
	return Math.round(amount * 100);
}

function toNumber(value: { toNumber: () => number } | number): number {
	return typeof value === "number" ? value : value.toNumber();
}

const transactionInclude = {
	account: {
		select: {
			name: true,
		},
	},
};

function mapTransaction(transaction: {
	id: string;
	userId: string;
	accountId: string;
	type: string;
	expenseKind?: TransactionExpenseKind | null;
	amount: { toNumber: () => number } | number;
	currency: string;
	category: string;
	occurredAt: Date;
	note: string | null;
	createdAt: Date;
	updatedAt: Date;
	account: {
		name: string;
	};
}): PersonalTransaction {
	return {
		id: transaction.id,
		userId: transaction.userId,
		accountId: transaction.accountId,
		accountName: transaction.account.name,
		type: transaction.type,
		expenseKind: transaction.expenseKind ?? null,
		amount:
			typeof transaction.amount === "number"
				? transaction.amount
				: transaction.amount.toNumber(),
		currency: transaction.currency,
		category: transaction.category,
		occurredAt: transaction.occurredAt,
		note: transaction.note,
		createdAt: transaction.createdAt,
		updatedAt: transaction.updatedAt,
	};
}
