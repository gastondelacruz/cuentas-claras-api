import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	ParseUUIDPipe,
	Patch,
	Post,
} from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { ArchiveGroupUseCase } from "../../application/use-cases/archive-group.use-case";
import { CreateGroupUseCase } from "../../application/use-cases/create-group.use-case";
import { GetGroupDetailUseCase } from "../../application/use-cases/get-group-detail.use-case";
import { ListGroupsUseCase } from "../../application/use-cases/list-groups.use-case";
import { UpdateGroupUseCase } from "../../application/use-cases/update-group.use-case";
import { CreateGroupDto } from "./dto/create-group.dto";
import { UpdateGroupDto } from "./dto/update-group.dto";

@ApiTags("groups")
@Controller("api/v1/groups")
export class GroupsController {
	constructor(
		private readonly createGroupUseCase: CreateGroupUseCase,
		private readonly listGroupsUseCase: ListGroupsUseCase,
		private readonly getGroupDetailUseCase: GetGroupDetailUseCase,
		private readonly updateGroupUseCase: UpdateGroupUseCase,
		private readonly archiveGroupUseCase: ArchiveGroupUseCase,
	) {}

	@Post()
	@ApiCreatedResponse()
	create(@Body() body: CreateGroupDto) {
		return this.createGroupUseCase.execute(body);
	}

	@Get()
	@ApiOkResponse()
	list() {
		return this.listGroupsUseCase.execute();
	}

	@Get(":groupId")
	@ApiOkResponse()
	getById(@Param("groupId", ParseUUIDPipe) groupId: string) {
		return this.getGroupDetailUseCase.execute(groupId);
	}

	@Patch(":groupId")
	@ApiOkResponse()
	update(
		@Param("groupId", ParseUUIDPipe) groupId: string,
		@Body() body: UpdateGroupDto,
	) {
		return this.updateGroupUseCase.execute(groupId, body);
	}

	@Delete(":groupId")
	@ApiOkResponse()
	archive(@Param("groupId", ParseUUIDPipe) groupId: string) {
		return this.archiveGroupUseCase.execute(groupId);
	}
}
