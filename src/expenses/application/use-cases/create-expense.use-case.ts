import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../../shared/exceptions/business.exception";
import { ExpenseEntity } from "../../domain/entities/expense-entity";
import { ExpenseRepository } from "../../domain/ports/expense.repository";
import { Amount } from "../../domain/value-objects/amount.vo";
import type { SplitType } from "../../domain/value-objects/split-type.vo";

export type CreateExpenseInput = {
	groupId: string;
	title: string;
	amount: number;
	currency: string;
	paidByMemberId: string;
	participantMemberIds: string[];
	splitType: SplitType;
	category: string | null;
	notes: string | null;
	expenseDate: Date;
};

@Injectable()
export class CreateExpenseUseCase {
	constructor(private readonly expenseRepository: ExpenseRepository) {}

	async execute(input: CreateExpenseInput): Promise<ExpenseEntity> {
		const members = await this.expenseRepository.findActiveGroupMembers(
			input.groupId,
		);

		if (members === null) {
			throw new BusinessException("GROUP_NOT_FOUND", "Group not found.", 404);
		}

		const memberById = new Map(members.map((member) => [member.id, member]));

		if (!memberById.has(input.paidByMemberId)) {
			throw new BusinessException(
				"EXPENSE_PAYER_NOT_IN_GROUP",
				"The payer must be an active member of the group.",
				400,
			);
		}

		for (const participantId of input.participantMemberIds) {
			if (!memberById.has(participantId)) {
				throw new BusinessException(
					"EXPENSE_PARTICIPANT_NOT_IN_GROUP",
					"All participants must be active members of the group.",
					400,
				);
			}
		}

		if (!input.participantMemberIds.includes(input.paidByMemberId)) {
			throw new BusinessException(
				"EXPENSE_PAYER_NOT_PARTICIPANT",
				"The payer must be included in the participants.",
				400,
			);
		}

		const expense = ExpenseEntity.createWithEqualSplit({
			id: crypto.randomUUID(),
			groupId: input.groupId,
			title: input.title,
			amount: new Amount(input.amount),
			currency: input.currency,
			paidByMemberId: input.paidByMemberId,
			splitType: input.splitType,
			category: input.category,
			notes: input.notes,
			expenseDate: input.expenseDate,
			participants: input.participantMemberIds.map((memberId) => ({
				memberId,
				displayName: memberById.get(memberId)?.displayName ?? "",
			})),
		});

		return this.expenseRepository.create(expense);
	}
}
