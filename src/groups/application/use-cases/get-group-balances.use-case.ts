import { Injectable } from "@nestjs/common";
import { DEV_USER_ID } from "../../../shared/constants/dev-user";
import { BusinessException } from "../../../shared/exceptions/business.exception";
import { GroupRepository } from "../../domain/ports/group.repository";
import {
	calculateGroupBalances,
	type MemberBalance,
} from "../../domain/services/balance-calculator";

@Injectable()
export class GetGroupBalancesUseCase {
	constructor(private readonly groupRepository: GroupRepository) {}

	async execute(groupId: string): Promise<MemberBalance[]> {
		const ledger = await this.groupRepository.findGroupLedgerForUser({
			groupId,
			userId: DEV_USER_ID,
		});

		if (ledger === null) {
			throw new BusinessException("GROUP_NOT_FOUND", "Group not found.", 404);
		}

		return calculateGroupBalances(ledger);
	}
}
