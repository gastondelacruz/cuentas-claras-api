import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../../shared/exceptions/business.exception";
import type { GroupEntity } from "../../domain/entities/group-entity";
import type { UpdateGroupPayload } from "../../domain/ports/group.repository";
import { GroupRepository } from "../../domain/ports/group.repository";
import { SendGroupInvitationsService } from "../services/send-group-invitations.service";

@Injectable()
export class UpdateGroupUseCase {
	constructor(
		private readonly groupRepository: GroupRepository,
		private readonly groupInvitations: SendGroupInvitationsService,
	) {}

	async execute(
		userId: string,
		groupId: string,
		payload: UpdateGroupPayload,
	): Promise<GroupEntity> {
		const group = await this.groupRepository.updateByIdAndOwner(
			groupId,
			userId,
			payload,
		);

		if (!group) {
			throw new BusinessException("GROUP_NOT_FOUND", "Group not found.", 404);
		}

		if (payload.members !== undefined) {
			await this.groupInvitations.sendForPendingMembers(group);
		}

		return group;
	}
}
