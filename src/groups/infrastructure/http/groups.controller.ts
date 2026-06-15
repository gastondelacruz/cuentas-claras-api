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
import { GetGroupBalancesUseCase } from "../../application/use-cases/get-group-balances.use-case";
import { GetGroupDetailUseCase } from "../../application/use-cases/get-group-detail.use-case";
import { GetGroupSettlementsUseCase } from "../../application/use-cases/get-group-settlements.use-case";
import { ListGroupsUseCase } from "../../application/use-cases/list-groups.use-case";
import { UpdateGroupUseCase } from "../../application/use-cases/update-group.use-case";
import { CreateGroupRequestDto } from "./dto/create-group-request.dto";
import { UpdateGroupDto } from "./dto/update-group.dto";
import { GroupMapper } from "./mappers/group.mapper";
import { CreateGroupResponseDto } from "./dto/create-group-response.dto";
import { GroupBalancesResponseDto } from "./dto/group-balances-response.dto";
import { GroupSettlementsResponseDto } from "./dto/group-settlements-response.dto";

@ApiTags("groups")
@Controller("api/v1/groups")
export class GroupsController {
	constructor(
		private readonly createGroupUseCase: CreateGroupUseCase,
		private readonly listGroupsUseCase: ListGroupsUseCase,
		private readonly getGroupDetailUseCase: GetGroupDetailUseCase,
		private readonly updateGroupUseCase: UpdateGroupUseCase,
		private readonly archiveGroupUseCase: ArchiveGroupUseCase,
		private readonly getGroupBalancesUseCase: GetGroupBalancesUseCase,
		private readonly getGroupSettlementsUseCase: GetGroupSettlementsUseCase,
	) {}

  @Post()
  @ApiCreatedResponse()
	async create(@Body() body: CreateGroupRequestDto): Promise<CreateGroupResponseDto> {
		const groupDomain = GroupMapper.toDomain(body);
		const group = await this.createGroupUseCase.execute(groupDomain);
		return GroupMapper.toCreateResponseDto(group);
	}

  @Get()
  @ApiOkResponse()
	async list(): Promise<CreateGroupResponseDto[]> {
		const groups = await this.listGroupsUseCase.execute();
		return groups.map((group) => GroupMapper.toListResponseDto(group));
	}

  @Get(":groupId")
  @ApiOkResponse()
	async getById(
		@Param("groupId", ParseUUIDPipe) groupId: string,
	): Promise<CreateGroupResponseDto> {
		const group = await this.getGroupDetailUseCase.execute(groupId);
		return GroupMapper.toDetailResponseDto(group);
	}

  @Get(":groupId/balances")
  @ApiOkResponse()
	async getBalances(
		@Param("groupId", ParseUUIDPipe) groupId: string,
	): Promise<GroupBalancesResponseDto> {
		const balances = await this.getGroupBalancesUseCase.execute(groupId);
		return GroupMapper.toBalancesResponseDto(balances);
	}

  @Get(":groupId/settlements")
  @ApiOkResponse()
	async getSettlements(
		@Param("groupId", ParseUUIDPipe) groupId: string,
	): Promise<GroupSettlementsResponseDto> {
		const settlements = await this.getGroupSettlementsUseCase.execute(groupId);
		return GroupMapper.toSettlementsResponseDto(settlements);
	}

  @Patch(":groupId")
  @ApiOkResponse()
	async update(
		@Param("groupId", ParseUUIDPipe) groupId: string,
		@Body() body: UpdateGroupDto,
	): Promise<CreateGroupResponseDto> {
		const group = await this.updateGroupUseCase.execute(
			groupId,
			GroupMapper.toUpdatePayload(body),
		);
		return GroupMapper.toUpdateResponseDto(group);
	}

  @Delete(":groupId")
  @ApiOkResponse()
	async archive(
		@Param("groupId", ParseUUIDPipe) groupId: string,
	): Promise<CreateGroupResponseDto> {
		const group = await this.archiveGroupUseCase.execute(groupId);
		return GroupMapper.toArchiveResponseDto(group);
	}
}
