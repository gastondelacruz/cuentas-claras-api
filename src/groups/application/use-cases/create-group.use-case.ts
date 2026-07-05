import { Injectable } from "@nestjs/common";
import { GroupRepository } from "../../domain/ports/group.repository";
import { GroupEntity } from "../../domain/entities/group-entity";
import { GroupMemberEntity } from "../../domain/entities/group-member-entity";
import { GroupMemberUserResolver } from "../../domain/ports/group-member-user-resolver";

@Injectable()
export class CreateGroupUseCase {
	constructor(
		private readonly groupRepository: GroupRepository,
		private readonly memberUserResolver: GroupMemberUserResolver,
	) {}

	async execute(userId: string, payload: GroupEntity): Promise<GroupEntity> {
		const linkedPayload = await this.linkMembersByEmail(payload);

		return this.groupRepository.createForUser(userId, linkedPayload);
	}

	private async linkMembersByEmail(payload: GroupEntity): Promise<GroupEntity> {
		const emails = payload.members
			.map((member) => member.getEmailValue())
			.filter((email): email is string => email !== null);
		const usersByEmail = await this.memberUserResolver.resolveByEmails(emails);

		return new GroupEntity({
			id: payload.id,
			name: payload.name,
			description: payload.description,
			type: payload.type,
			currency: payload.currency,
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
			createdAt: payload.createdAt,
			updatedAt: payload.updatedAt,
			archivedAt: payload.archivedAt,
		});
	}
}
