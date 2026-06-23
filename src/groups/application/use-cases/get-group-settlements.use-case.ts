import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../../shared/exceptions/business.exception";
import { GroupRepository } from "../../domain/ports/group.repository";
import { calculateGroupBalances } from "../../domain/services/balance-calculator";
import {
	calculateSettlements,
	type SettlementSuggestion,
} from "../../domain/services/settlement-calculator";

@Injectable()
export class GetGroupSettlementsUseCase {
	constructor(private readonly groupRepository: GroupRepository) {}

	async execute(userId: string, groupId: string): Promise<SettlementSuggestion[]> {
		const ledger = await this.groupRepository.findGroupLedgerForUser({
			groupId,
			userId,
		});

		if (ledger === null) {
			throw new BusinessException("GROUP_NOT_FOUND", "Group not found.", 404);
		}

		const balances = calculateGroupBalances(ledger);

		return calculateSettlements(balances);
	}
}
