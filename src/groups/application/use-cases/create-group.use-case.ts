import { Injectable } from "@nestjs/common";
import { DEV_USER_ID } from "../../../shared/constants/dev-user";
import { GroupRepository } from "../../domain/ports/group.repository";
import { GroupEntity } from "../../domain/entities/group-entity";

@Injectable()
export class CreateGroupUseCase {
  constructor(private readonly groupRepository: GroupRepository) {}

  execute(payload: GroupEntity): Promise<GroupEntity> {
    // TODO: se deberia sacar el userId del token de autenticacion en vez de usar un valor hardcodeado
    return this.groupRepository.createForUser(DEV_USER_ID, payload);
  }
}
