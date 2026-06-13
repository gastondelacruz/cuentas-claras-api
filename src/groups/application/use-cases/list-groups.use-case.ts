import { Injectable } from "@nestjs/common";
import { DEV_USER_ID } from "../../../shared/constants/dev-user";
import type { GroupListItem } from "../../domain/entities/group-list-item";
import { GroupRepository } from "../../domain/ports/group.repository";

@Injectable()
export class ListGroupsUseCase {
	constructor(private readonly groupRepository: GroupRepository) {}

	async execute(): Promise<GroupListItem[]> {
		return this.groupRepository.listByUser(DEV_USER_ID);
	}
}
