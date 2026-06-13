import { Injectable, NotFoundException } from "@nestjs/common";
import { DEV_USER_ID } from "../../../shared/constants/dev-user";
import type { ArchivedGroup } from "../../domain/ports/group.repository";
import { GroupRepository } from "../../domain/ports/group.repository";

@Injectable()
export class ArchiveGroupUseCase {
	constructor(private readonly groupRepository: GroupRepository) {}

	async execute(groupId: string): Promise<ArchivedGroup> {
		const group = await this.groupRepository.archiveByIdAndOwner(
			groupId,
			DEV_USER_ID,
		);

		if (!group) {
			throw new NotFoundException("Group not found.");
		}

		return group;
	}
}
