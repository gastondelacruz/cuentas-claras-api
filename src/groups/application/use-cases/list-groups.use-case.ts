import { Injectable } from "@nestjs/common";
import { DEV_USER_ID } from "../../../shared/constants/dev-user";
import type { GroupEntity } from "../../domain/entities/group-entity";
import { GroupRepository } from "../../domain/ports/group.repository";

@Injectable()
export class ListGroupsUseCase {
  constructor(private readonly groupRepository: GroupRepository) {}

	async execute(): Promise<GroupEntity[]> {
		return this.groupRepository.listByUser(DEV_USER_ID);
	}
}
