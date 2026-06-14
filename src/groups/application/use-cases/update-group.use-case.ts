import { Injectable, NotFoundException } from "@nestjs/common";
import { DEV_USER_ID } from "../../../shared/constants/dev-user";
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
      throw new NotFoundException("Group not found.");
    }

    return group;
  }
}
