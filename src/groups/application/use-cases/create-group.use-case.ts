import { Injectable } from "@nestjs/common";
import { GroupRepository } from "../../domain/ports/group.repository";
import { GroupEntity } from "../../domain/entities/group-entity";

@Injectable()
export class CreateGroupUseCase {
	constructor(private readonly groupRepository: GroupRepository) {}

	execute(userId: string, payload: GroupEntity): Promise<GroupEntity> {
		return this.groupRepository.createForUser(userId, payload);
	}
}
