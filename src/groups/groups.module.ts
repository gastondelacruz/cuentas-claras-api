import { Module } from "@nestjs/common";
import { ArchiveGroupUseCase } from "./application/use-cases/archive-group.use-case";
import { CreateGroupUseCase } from "./application/use-cases/create-group.use-case";
import { GetGroupBalancesUseCase } from "./application/use-cases/get-group-balances.use-case";
import { GetGroupDetailUseCase } from "./application/use-cases/get-group-detail.use-case";
import { ListGroupsUseCase } from "./application/use-cases/list-groups.use-case";
import { UpdateGroupUseCase } from "./application/use-cases/update-group.use-case";
import { GroupRepository } from "./domain/ports/group.repository";
import { GroupsController } from "./infrastructure/http/groups.controller";
import { AtLeastOneFieldConstraint } from "./infrastructure/http/validators/at-least-one-field.validator";
import { PrismaGroupRepository } from "./infrastructure/persistence/prisma-group.repository";

@Module({
  controllers: [GroupsController],
  providers: [
    CreateGroupUseCase,
    ListGroupsUseCase,
    GetGroupDetailUseCase,
    UpdateGroupUseCase,
    ArchiveGroupUseCase,
    GetGroupBalancesUseCase,
    AtLeastOneFieldConstraint,
    PrismaGroupRepository,
    {
      provide: GroupRepository,
      useExisting: PrismaGroupRepository,
    },
  ],
})
export class GroupsModule {}
