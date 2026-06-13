import { Injectable } from "@nestjs/common";
import { DEV_USER_ID } from "../../../shared/constants/dev-user";
import type { GroupListItemReadModel } from "../read-models/group-list-item.read-model";
import { GroupRepository } from "../../domain/ports/group.repository";

@Injectable()
export class ListGroupsUseCase {
	constructor(private readonly groupRepository: GroupRepository) {}

	async execute(): Promise<GroupListItemReadModel[]> {
		return this.groupRepository.listByUser(DEV_USER_ID);
	}
}
