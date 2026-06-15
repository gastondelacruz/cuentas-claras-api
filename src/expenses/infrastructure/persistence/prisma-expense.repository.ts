import { Injectable } from "@nestjs/common";
import { SplitType as PrismaSplitType } from "@prisma/client";
import { PrismaService } from "../../../prisma/prisma.service";
import { DatabaseException } from "../../../shared/exceptions/database.exception";
import { ExpenseEntity } from "../../domain/entities/expense-entity";
import {
	ExpenseRepository,
	type ExpenseDetail,
	type ExpenseListPage,
	type GroupMemberRef,
} from "../../domain/ports/expense.repository";
import type { SplitType } from "../../domain/value-objects/split-type.vo";

@Injectable()
export class PrismaExpenseRepository extends ExpenseRepository {
	constructor(private readonly prisma: PrismaService) {
		super();
	}

	async findActiveGroupMembers(
		groupId: string,
	): Promise<GroupMemberRef[] | null> {
		return this.runDatabaseOperation(
			"EXPENSE_GROUP_MEMBERS_DATABASE_ERROR",
			async () => {
				const group = await this.prisma.group.findFirst({
					where: {
						id: groupId,
						archivedAt: null,
					},
					select: {
						id: true,
					},
				});

				if (!group) {
					return null;
				}

				return this.prisma.groupMember.findMany({
					where: {
						groupId,
						removedAt: null,
					},
					select: {
						id: true,
						displayName: true,
					},
					orderBy: {
						createdAt: "asc",
					},
				});
			},
		);
	}

	async create(expense: ExpenseEntity): Promise<ExpenseEntity> {
		return this.runDatabaseOperation("EXPENSE_CREATE_DATABASE_ERROR", () =>
			this.prisma.$transaction(async (tx) => {
				const created = await tx.expense.create({
					data: {
						id: expense.id,
						groupId: expense.groupId,
						title: expense.title,
						amount: expense.amountValue.toFixed(2),
						currency: expense.currency,
						paidByMemberId: expense.paidByMemberId,
						splitType: toPrismaSplitType(expense.splitType),
						category: expense.category,
						notes: expense.notes,
						expenseDate: expense.expenseDate,
					},
					select: {
						id: true,
						createdAt: true,
						updatedAt: true,
					},
				});

				await tx.expenseSplit.createMany({
					data: expense.splits.map((split) => ({
						expenseId: created.id,
						memberId: split.memberId,
						owedAmount: split.owedAmount.toFixed(2),
						paidAmount: split.paidAmount.toFixed(2),
						netAmount: split.netAmount.toFixed(2),
					})),
				});

				return new ExpenseEntity({
					id: created.id,
					groupId: expense.groupId,
					title: expense.title,
					amount: expense.amountValue,
					currency: expense.currency,
					paidByMemberId: expense.paidByMemberId,
					splitType: expense.splitType,
					category: expense.category,
					notes: expense.notes,
					expenseDate: expense.expenseDate,
					createdAt: created.createdAt,
					updatedAt: created.updatedAt,
					splits: expense.splits,
				});
			}),
		);
	}

	async listByGroupForUser(input: {
		groupId: string;
		userId: string;
		limit: number;
		cursor?: string;
	}): Promise<ExpenseListPage | null> {
		return this.runDatabaseOperation("EXPENSE_LIST_DATABASE_ERROR", async () => {
			const group = await this.prisma.group.findFirst({
				where: {
					id: input.groupId,
					archivedAt: null,
					groupMembers: {
						some: {
							userId: input.userId,
							removedAt: null,
						},
					},
				},
				select: {
					id: true,
				},
			});

			if (!group) {
				return null;
			}

			const expenses = await this.prisma.expense.findMany({
				where: {
					groupId: input.groupId,
					deletedAt: null,
				},
				select: {
					id: true,
					groupId: true,
					title: true,
					amount: true,
					currency: true,
					paidByMember: {
						select: {
							id: true,
							displayName: true,
						},
					},
					_count: {
						select: {
							expenseSplits: true,
						},
					},
					category: true,
					expenseDate: true,
					createdAt: true,
				},
				orderBy: [{ expenseDate: "desc" }, { id: "desc" }],
				take: input.limit + 1,
				...(input.cursor ? { cursor: { id: input.cursor } } : {}),
			});

			const visibleExpenses = expenses.slice(0, input.limit);
			const nextCursor = expenses.length > input.limit ? expenses[input.limit].id : null;

			return {
				expenses: visibleExpenses.map((expense) => ({
					id: expense.id,
					groupId: expense.groupId,
					title: expense.title,
					amount: decimalToNumber(expense.amount),
					currency: expense.currency,
					paidBy: {
						id: expense.paidByMember.id,
						displayName: expense.paidByMember.displayName,
					},
					participantsCount: expense._count.expenseSplits,
					category: expense.category,
					expenseDate: expense.expenseDate,
					createdAt: expense.createdAt,
				})),
				nextCursor,
			};
		});
	}

	async findDetailByIdForUser(input: {
		expenseId: string;
		userId: string;
	}): Promise<ExpenseDetail | null> {
		return this.runDatabaseOperation("EXPENSE_DETAIL_DATABASE_ERROR", async () => {
			const expense = await this.prisma.expense.findFirst({
				where: {
					id: input.expenseId,
					deletedAt: null,
					group: {
						archivedAt: null,
						groupMembers: {
							some: {
								userId: input.userId,
								removedAt: null,
							},
						},
					},
				},
				select: {
					id: true,
					groupId: true,
					title: true,
					amount: true,
					currency: true,
					paidByMember: {
						select: {
							id: true,
							displayName: true,
						},
					},
					expenseSplits: {
						select: {
							memberId: true,
							owedAmount: true,
							paidAmount: true,
							netAmount: true,
							member: {
								select: {
									displayName: true,
								},
							},
						},
						orderBy: {
							createdAt: "asc",
						},
					},
					splitType: true,
					category: true,
					notes: true,
					expenseDate: true,
					createdAt: true,
					updatedAt: true,
				},
			});

			if (!expense) {
				return null;
			}

			return {
				id: expense.id,
				groupId: expense.groupId,
				title: expense.title,
				amount: decimalToNumber(expense.amount),
				currency: expense.currency,
				paidBy: {
					id: expense.paidByMember.id,
					displayName: expense.paidByMember.displayName,
				},
				participants: expense.expenseSplits.map((split) => ({
					memberId: split.memberId,
					displayName: split.member.displayName,
					owedAmount: decimalToNumber(split.owedAmount),
					paidAmount: decimalToNumber(split.paidAmount),
					netAmount: decimalToNumber(split.netAmount),
				})),
				splitType: fromPrismaSplitType(expense.splitType),
				category: expense.category,
				notes: expense.notes,
				expenseDate: expense.expenseDate,
				createdAt: expense.createdAt,
				updatedAt: expense.updatedAt,
			};
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

function decimalToNumber(value: unknown): number {
	if (typeof value === "object" && value !== null && "toNumber" in value) {
		return (value as { toNumber: () => number }).toNumber();
	}

	return Number(value);
}

function toPrismaSplitType(splitType: SplitType): PrismaSplitType {
	const mapping: Record<SplitType, PrismaSplitType> = {
		equal: PrismaSplitType.EQUAL,
	};

	return mapping[splitType];
}

function fromPrismaSplitType(splitType: PrismaSplitType): SplitType {
	const mapping: Record<PrismaSplitType, SplitType> = {
		[PrismaSplitType.EQUAL]: "equal",
		[PrismaSplitType.CUSTOM]: "custom" as SplitType,
	};

	return mapping[splitType];
}
