import { Injectable } from "@nestjs/common";
import type { GroupEntity } from "../../domain/entities/group-entity";
import { GroupRepository } from "../../domain/ports/group.repository";

@Injectable()
export class ListGroupsUseCase {
	constructor(private readonly groupRepository: GroupRepository) {}

	async execute(userId: string): Promise<GroupEntity[]> {
		return this.groupRepository.listByUser(userId);
	}
}
