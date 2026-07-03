import { Injectable } from "@nestjs/common";
import type { GroupEntity } from "../../domain/entities/group-entity";
import { GroupRepository } from "../../domain/ports/group.repository";
import { calculateMemberBalance } from "../../domain/services/balance-calculator";

export type GroupListItem = {
	group: GroupEntity;
	currentUserBalance: number;
};

@Injectable()
export class ListGroupsUseCase {
	constructor(private readonly groupRepository: GroupRepository) {}

	async execute(userId: string): Promise<GroupListItem[]> {
		const entries = await this.groupRepository.listByUserWithLedgers(userId);

		return entries.map((entry) => ({
			group: entry.group,
			currentUserBalance: calculateMemberBalance(
				entry.ledger,
				entry.currentUserMemberId,
				entry.group.currency.getValue(),
			),
		}));
	}
}
