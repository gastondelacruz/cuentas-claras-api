import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../../shared/exceptions/business.exception";
import { GroupRepository } from "../../domain/ports/group.repository";
import {
	calculateGroupBalances,
	type MemberBalance,
} from "../../domain/services/balance-calculator";

@Injectable()
export class GetGroupBalancesUseCase {
	constructor(private readonly groupRepository: GroupRepository) {}

	async execute(userId: string, groupId: string): Promise<MemberBalance[]> {
		const ledger = await this.groupRepository.findGroupLedgerForUser({
			groupId,
			userId,
		});

		if (ledger === null) {
			throw new BusinessException("GROUP_NOT_FOUND", "Group not found.", 404);
		}

		return calculateGroupBalances(ledger);
	}
}
