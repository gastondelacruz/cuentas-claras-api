import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../../shared/exceptions/business.exception";
import type { GroupEntity } from "../../domain/entities/group-entity";
import { GroupRepository } from "../../domain/ports/group.repository";

@Injectable()
export class GetGroupDetailUseCase {
	constructor(private readonly groupRepository: GroupRepository) {}

	async execute(userId: string, groupId: string): Promise<GroupEntity> {
		const group = await this.groupRepository.findDetailByIdAndOwner(groupId, userId);

		if (!group) {
			throw new BusinessException("GROUP_NOT_FOUND", "Group not found.", 404);
		}

		return group;
	}
}
