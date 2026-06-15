import { Injectable } from "@nestjs/common";
import { DEV_USER_ID } from "../../../shared/constants/dev-user";
import { BusinessException } from "../../../shared/exceptions/business.exception";
import { ExpenseEntity } from "../../domain/entities/expense-entity";
import { ExpenseSplitEntity } from "../../domain/entities/expense-split-entity";
import {
	ExpenseRepository,
	type ExpenseDetail,
} from "../../domain/ports/expense.repository";
import { Amount } from "../../domain/value-objects/amount.vo";
import type { SplitType } from "../../domain/value-objects/split-type.vo";

export type UpdateExpenseInput = {
	expenseId: string;
	title?: string;
	amount?: number;
	currency?: string;
	paidByMemberId?: string;
	participantMemberIds?: string[];
	splitType?: SplitType;
	category?: string | null;
	notes?: string | null;
	expenseDate?: Date;
};

@Injectable()
export class UpdateExpenseUseCase {
	constructor(private readonly expenseRepository: ExpenseRepository) {}

	async execute(input: UpdateExpenseInput): Promise<ExpenseDetail> {
		const current = await this.expenseRepository.findDetailByIdForUser({
			expenseId: input.expenseId,
			userId: DEV_USER_ID,
		});

		if (current === null) {
			throw new BusinessException(
				"EXPENSE_NOT_FOUND",
				"Expense not found.",
				404,
			);
		}

		const shouldRecalculateSplits =
			input.amount !== undefined ||
			input.paidByMemberId !== undefined ||
			input.participantMemberIds !== undefined ||
			input.splitType !== undefined;

		if (!shouldRecalculateSplits) {
			const updatedExpense = new ExpenseEntity({
				id: current.id,
				groupId: current.groupId,
				title: input.title ?? current.title,
				amount: new Amount(current.amount),
				currency: input.currency ?? current.currency,
				paidByMemberId: current.paidBy.id,
				splitType: current.splitType as SplitType,
				category: input.category !== undefined ? input.category : current.category,
				notes: input.notes !== undefined ? input.notes : current.notes,
				expenseDate: input.expenseDate ?? current.expenseDate,
				splits: current.participants.map(
					(participant) =>
						new ExpenseSplitEntity({
							memberId: participant.memberId,
							displayName: participant.displayName,
							owedAmount: participant.owedAmount,
							paidAmount: participant.paidAmount,
							netAmount: participant.netAmount,
						}),
				),
			});

			return this.expenseRepository.update(input.expenseId, updatedExpense, {
				replaceSplits: false,
			});
		}

		const members = await this.expenseRepository.findActiveGroupMembers(
			current.groupId,
		);

		if (members === null) {
			throw new BusinessException("GROUP_NOT_FOUND", "Group not found.", 404);
		}

		const memberById = new Map(members.map((member) => [member.id, member]));
		const paidByMemberId = input.paidByMemberId ?? current.paidBy.id;
		const participantMemberIds =
			input.participantMemberIds ??
			current.participants.map((participant) => participant.memberId);

		if (!memberById.has(paidByMemberId)) {
			throw new BusinessException(
				"EXPENSE_PAYER_NOT_IN_GROUP",
				"The payer must be an active member of the group.",
				400,
			);
		}

		for (const participantId of participantMemberIds) {
			if (!memberById.has(participantId)) {
				throw new BusinessException(
					"EXPENSE_PARTICIPANT_NOT_IN_GROUP",
					"All participants must be active members of the group.",
					400,
				);
			}
		}

		if (!participantMemberIds.includes(paidByMemberId)) {
			throw new BusinessException(
				"EXPENSE_PAYER_NOT_PARTICIPANT",
				"The payer must be included in the participants.",
				400,
			);
		}

		const splitType = (input.splitType ?? current.splitType) as SplitType;

		const updatedExpense = ExpenseEntity.createWithEqualSplit({
			id: current.id,
			groupId: current.groupId,
			title: input.title ?? current.title,
			amount: new Amount(input.amount ?? current.amount),
			currency: input.currency ?? current.currency,
			paidByMemberId,
			splitType,
			category: input.category !== undefined ? input.category : current.category,
			notes: input.notes !== undefined ? input.notes : current.notes,
			expenseDate: input.expenseDate ?? current.expenseDate,
			participants: participantMemberIds.map((memberId) => ({
				memberId,
				displayName: memberById.get(memberId)?.displayName ?? "",
			})),
		});

		return this.expenseRepository.update(input.expenseId, updatedExpense, {
			replaceSplits: true,
		});
	}
}
