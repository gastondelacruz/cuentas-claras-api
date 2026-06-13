import { Injectable } from "@nestjs/common";
import { DEV_USER_ID } from "../../../shared/constants/dev-user";
import type { CreateGroupPayload } from "../../domain/entities/create-group-payload";
import type { CreatedGroupSummary } from "../../domain/ports/group.repository";
import { GroupRepository } from "../../domain/ports/group.repository";

@Injectable()
export class CreateGroupUseCase {
	constructor(private readonly groupRepository: GroupRepository) {}

	execute(payload: CreateGroupPayload): Promise<CreatedGroupSummary> {
		return this.groupRepository.createForUser(DEV_USER_ID, payload);
	}
}
