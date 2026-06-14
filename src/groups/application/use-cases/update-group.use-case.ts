import { Injectable } from "@nestjs/common";
import { DEV_USER_ID } from "../../../shared/constants/dev-user";
import { BusinessException } from "../../../shared/exceptions/business.exception";
import type { GroupEntity } from "../../domain/entities/group-entity";
import type { UpdateGroupPayload } from "../../domain/ports/group.repository";
import { GroupRepository } from "../../domain/ports/group.repository";

@Injectable()
export class UpdateGroupUseCase {
  constructor(private readonly groupRepository: GroupRepository) {}

	async execute(groupId: string, payload: UpdateGroupPayload): Promise<GroupEntity> {
    const group = await this.groupRepository.updateByIdAndOwner(
      groupId,
      DEV_USER_ID,
      payload,
    );

		if (!group) {
			throw new BusinessException("GROUP_NOT_FOUND", "Group not found.", 404);
		}

    return group;
  }
}
