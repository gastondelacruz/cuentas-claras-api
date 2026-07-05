import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../../shared/exceptions/business.exception";
import type { GroupEntity } from "../../domain/entities/group-entity";
import { GroupMemberEntity } from "../../domain/entities/group-member-entity";
import { GroupMemberUserResolver } from "../../domain/ports/group-member-user-resolver";
import type { UpdateGroupPayload } from "../../domain/ports/group.repository";
import { GroupRepository } from "../../domain/ports/group.repository";

@Injectable()
export class UpdateGroupUseCase {
	constructor(
		private readonly groupRepository: GroupRepository,
		private readonly memberUserResolver: GroupMemberUserResolver,
	) {}

	async execute(
		userId: string,
		groupId: string,
		payload: UpdateGroupPayload,
	): Promise<GroupEntity> {
		const linkedPayload = await this.linkPayloadMembersByEmail(payload);
		const group = await this.groupRepository.updateByIdAndOwner(
			groupId,
			userId,
			linkedPayload,
		);

		if (!group) {
			throw new BusinessException("GROUP_NOT_FOUND", "Group not found.", 404);
		}

		return group;
	}

	private async linkPayloadMembersByEmail(
		payload: UpdateGroupPayload,
	): Promise<UpdateGroupPayload> {
		if (payload.members === undefined) {
			return payload;
		}

		const emails = payload.members
			.map((member) => member.getEmailValue())
			.filter((email): email is string => email !== null);
		const usersByEmail = await this.memberUserResolver.resolveByEmails(emails);

		return {
			...payload,
			members: payload.members.map(
				(member) =>
					new GroupMemberEntity({
						id: member.id,
						displayName: member.displayName,
						email: member.email,
						userId: member.getEmailValue()
							? (usersByEmail.get(member.getEmailValue() ?? "") ?? member.userId)
							: member.userId,
						removedAt: member.removedAt,
					}),
			),
		};
	}
}
