import { Injectable, NotFoundException } from "@nestjs/common";
import { DEV_USER_ID } from "../../../shared/constants/dev-user";
import type { GroupDetail } from "../../domain/entities/group-detail";
import { GroupRepository } from "../../domain/ports/group.repository";

@Injectable()
export class GetGroupDetailUseCase {
	constructor(private readonly groupRepository: GroupRepository) {}

	async execute(groupId: string): Promise<GroupDetail> {
		const group = await this.groupRepository.findDetailByIdAndOwner(
			groupId,
			DEV_USER_ID,
		);

		if (!group) {
			throw new NotFoundException("Group not found.");
		}

		return group;
	}
}
