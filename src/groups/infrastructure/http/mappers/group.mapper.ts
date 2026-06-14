import { GroupEntity } from "../../../domain/entities/group-entity";
import { GroupMemberEntity } from "../../../domain/entities/group-member-entity";
import type { UpdateGroupPayload } from "../../../domain/ports/group.repository";
import { Currency } from "../../../domain/value-objects/currency.vo";
import { GroupName } from "../../../domain/value-objects/group-name.vo";
import { CreateGroupRequestDto } from "../dto/create-group-request.dto";
import { CreateGroupResponseDto } from "../dto/create-group-response.dto";
import { UpdateGroupDto } from "../dto/update-group.dto";

const DEV_USER_ID = "00000000-0000-0000-0000-000000000001";

export class GroupMapper {
	static toDomain(dto: CreateGroupRequestDto): GroupEntity {
		return new GroupEntity({
			id: crypto.randomUUID(),
			name: new GroupName(dto.name),
			description: dto.description ?? null,
			type: dto.type,
			currency: new Currency(dto.currency),
			members: GroupMapper.toInvitedMembers(dto.members),
		});
	}

	static toUpdatePayload(dto: UpdateGroupDto): UpdateGroupPayload {
		return {
			...(dto.name !== undefined ? { name: new GroupName(dto.name) } : {}),
			...(dto.description !== undefined ? { description: dto.description } : {}),
			...(dto.type !== undefined ? { type: dto.type } : {}),
			...(dto.currency !== undefined ? { currency: new Currency(dto.currency) } : {}),
			...(dto.members !== undefined
				? { members: GroupMapper.toInvitedMembers(dto.members) }
				: {}),
		};
	}

	static toCreateResponseDto(group: GroupEntity): CreateGroupResponseDto {
		return {
			...GroupMapper.toBaseResponseDto(group),
			type: group.type,
			membersCount: group.members.length,
			expensesCount: 0,
			totalAmount: 0,
			currentUserBalance: 0,
			createdAt: group.createdAt?.toISOString(),
			updatedAt: group.updatedAt?.toISOString(),
		};
	}

	static toListResponseDto(group: GroupEntity): CreateGroupResponseDto {
		return {
			id: group.id,
			name: group.name.getValue(),
			description: group.description,
			currency: group.currency.getValue(),
			createdAt: group.createdAt?.toISOString(),
			updatedAt: group.updatedAt?.toISOString(),
		};
	}

	static toDetailResponseDto(group: GroupEntity): CreateGroupResponseDto {
		return {
			id: group.id,
			name: group.name.getValue(),
			description: group.description,
			currency: group.currency.getValue(),
			members: group.members.map((member) => ({
				id: member.id,
				displayName: member.displayName,
				email: member.getEmailValue() ?? undefined,
				isCurrentUser: member.isCurrentUser(DEV_USER_ID),
				removedAt: member.removedAt?.toISOString() ?? null,
			})),
			expenses: [],
			balances: [],
			createdAt: group.createdAt?.toISOString(),
			updatedAt: group.updatedAt?.toISOString(),
		};
	}

	static toUpdateResponseDto(group: GroupEntity): CreateGroupResponseDto {
		return {
			...GroupMapper.toBaseResponseDto(group),
			type: group.type,
			membersCount: group.members.length,
			expensesCount: 0,
			totalAmount: 0,
			currentUserBalance: 0,
			updatedAt: group.updatedAt?.toISOString(),
		};
	}

	static toArchiveResponseDto(group: GroupEntity): CreateGroupResponseDto {
		return {
			id: group.id,
			archivedAt: group.archivedAt?.toISOString() ?? null,
		};
	}

	private static toBaseResponseDto(group: GroupEntity): CreateGroupResponseDto {
		return {
			id: group.id,
			name: group.name.getValue(),
			description: group.description,
			type: group.type,
			currency: group.currency.getValue(),
		};
	}

	private static toInvitedMembers(
		members: CreateGroupRequestDto["members"],
	): GroupMemberEntity[] {
		return (members ?? []).map(
			(member, index) =>
				new GroupMemberEntity({
					id: `invited-${index}`,
					displayName: member.displayName,
					email: member.email ?? null,
					userId: null,
				}),
		);
	}
}
