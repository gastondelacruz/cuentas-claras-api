import { Injectable } from "@nestjs/common";
import { DEV_USER_ID } from "../../../shared/constants/dev-user";
import { BusinessException } from "../../../shared/exceptions/business.exception";
import type { GroupEntity } from "../../domain/entities/group-entity";
import { GroupRepository } from "../../domain/ports/group.repository";

@Injectable()
export class GetGroupDetailUseCase {
  constructor(private readonly groupRepository: GroupRepository) {}

	async execute(groupId: string): Promise<GroupEntity> {
    const group = await this.groupRepository.findDetailByIdAndOwner(
      groupId,
      DEV_USER_ID,
    );

		if (!group) {
			throw new BusinessException("GROUP_NOT_FOUND", "Group not found.", 404);
		}

    return group;
  }
}
