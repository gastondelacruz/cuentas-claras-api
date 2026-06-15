import { Injectable } from "@nestjs/common";
import { DEV_USER_ID } from "../../../shared/constants/dev-user";
import { BusinessException } from "../../../shared/exceptions/business.exception";
import {
	GroupRepository,
	type SettlementPaymentRef,
} from "../../domain/ports/group.repository";
import {
	calculateGroupBalances,
	type MemberBalance,
} from "../../domain/services/balance-calculator";

export type RecordSettlementPaymentInput = {
	groupId: string;
	fromMemberId: string;
	toMemberId: string;
	amount: number;
	currency: string;
	paidAt: Date;
	notes: string | null;
};

export type RecordSettlementPaymentResult = {
	payment: SettlementPaymentRef;
	balances: MemberBalance[];
};

@Injectable()
export class RecordSettlementPaymentUseCase {
	constructor(private readonly groupRepository: GroupRepository) {}

	async execute(
		input: RecordSettlementPaymentInput,
	): Promise<RecordSettlementPaymentResult> {
		const members = await this.groupRepository.findActiveGroupMembersForUser({
			groupId: input.groupId,
			userId: DEV_USER_ID,
		});

		if (members === null) {
			throw new BusinessException("GROUP_NOT_FOUND", "Group not found.", 404);
		}

		if (input.amount <= 0) {
			throw new BusinessException(
				"SETTLEMENT_AMOUNT_MUST_BE_POSITIVE",
				"Settlement amount must be greater than zero.",
				400,
			);
		}

		const memberIds = new Set(members.map((member) => member.memberId));
		if (!memberIds.has(input.fromMemberId) || !memberIds.has(input.toMemberId)) {
			throw new BusinessException(
				"SETTLEMENT_MEMBER_NOT_IN_GROUP",
				"Both settlement members must be active members of the group.",
				400,
			);
		}

		const payment = await this.groupRepository.recordSettlementPayment(input);
		const ledger = await this.groupRepository.findGroupLedgerForUser({
			groupId: input.groupId,
			userId: DEV_USER_ID,
		});

		if (ledger === null) {
			throw new BusinessException("GROUP_NOT_FOUND", "Group not found.", 404);
		}

		return {
			payment,
			balances: calculateGroupBalances(ledger),
		};
	}
}
