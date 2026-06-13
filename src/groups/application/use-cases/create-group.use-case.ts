import { Injectable } from "@nestjs/common";
import { DEV_USER_ID } from "../../../shared/constants/dev-user";
import type { CreateGroupCommand } from "../commands/create-group.command";
import type { CreatedGroupSummary } from "../../domain/ports/group.repository";
import { GroupRepository } from "../../domain/ports/group.repository";

@Injectable()
export class CreateGroupUseCase {
	constructor(private readonly groupRepository: GroupRepository) {}

	execute(payload: CreateGroupCommand): Promise<CreatedGroupSummary> {
		return this.groupRepository.createForUser(DEV_USER_ID, payload);
	}
}
