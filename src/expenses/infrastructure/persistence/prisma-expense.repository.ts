import { Injectable } from "@nestjs/common";
import { SplitType as PrismaSplitType } from "@prisma/client";
import { PrismaService } from "../../../prisma/prisma.service";
import { DatabaseException } from "../../../shared/exceptions/database.exception";
import { ExpenseEntity } from "../../domain/entities/expense-entity";
import {
	ExpenseRepository,
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

function toPrismaSplitType(splitType: SplitType): PrismaSplitType {
	const mapping: Record<SplitType, PrismaSplitType> = {
		equal: PrismaSplitType.EQUAL,
	};

	return mapping[splitType];
}
