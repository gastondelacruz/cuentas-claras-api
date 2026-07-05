import { Injectable } from "@nestjs/common";
import { GroupRepository } from "../../domain/ports/group.repository";
import { GroupEntity } from "../../domain/entities/group-entity";
import { SendGroupInvitationsService } from "../services/send-group-invitations.service";

@Injectable()
export class CreateGroupUseCase {
	constructor(
		private readonly groupRepository: GroupRepository,
		private readonly groupInvitations: SendGroupInvitationsService,
	) {}

	async execute(userId: string, payload: GroupEntity): Promise<GroupEntity> {
		const group = await this.groupRepository.createForUser(userId, payload);

		await this.groupInvitations.sendForPendingMembers(group);

		return group;
	}
}
