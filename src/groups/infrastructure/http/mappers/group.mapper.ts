import { GroupEntity } from "../../../domain/entities/group-entity";
import { GroupMemberEntity } from "../../../domain/entities/group-member-entity";
import type { UpdateGroupPayload } from "../../../domain/ports/group.repository";
import { type MemberBalance } from "../../../domain/services/balance-calculator";
import { type SettlementSuggestion } from "../../../domain/services/settlement-calculator";
import { Currency } from "../../../domain/value-objects/currency.vo";
import { GroupName } from "../../../domain/value-objects/group-name.vo";
import { CreateGroupRequestDto } from "../dto/create-group-request.dto";
import { CreateGroupResponseDto } from "../dto/create-group-response.dto";
import { GroupBalancesResponseDto } from "../dto/group-balances-response.dto";
import { GroupSettlementsResponseDto } from "../dto/group-settlements-response.dto";
import { RecordSettlementPaymentRequestDto } from "../dto/record-settlement-payment-request.dto";
import { RecordSettlementPaymentResponseDto } from "../dto/record-settlement-payment-response.dto";
import { UpdateGroupDto } from "../dto/update-group.dto";
import type {
	RecordSettlementPaymentInput,
	RecordSettlementPaymentResult,
} from "../../../application/use-cases/record-settlement-payment.use-case";
import type { GroupListItem } from "../../../application/use-cases/list-groups.use-case";

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

	static toRecordSettlementPaymentInput(
		groupId: string,
		dto: RecordSettlementPaymentRequestDto,
	): RecordSettlementPaymentInput {
		return {
			groupId,
			fromMemberId: dto.fromMemberId,
			toMemberId: dto.toMemberId,
			amount: dto.amount,
			currency: dto.currency,
			paidAt: new Date(dto.paidAt),
			notes: dto.notes ?? null,
		};
	}

	static toCreateResponseDto(
		group: GroupEntity,
		userId: string,
	): CreateGroupResponseDto {
		return {
			...GroupMapper.toBaseResponseDto(group),
			type: group.type,
			members: group.members.map((member) =>
				GroupMapper.toMemberResponseDto(member, userId),
			),
			membersCount: group.members.length,
			expensesCount: 0,
			totalAmount: 0,
			currentUserBalance: 0,
			expenses: [],
			balances: [],
			createdAt: group.createdAt?.toISOString(),
			updatedAt: group.updatedAt?.toISOString(),
			archivedAt: group.archivedAt?.toISOString() ?? null,
		};
	}

	static toListResponseDto(item: GroupListItem): CreateGroupResponseDto {
		const { group } = item;

		return {
			id: group.id,
			name: group.name.getValue(),
			description: group.description,
			currency: group.currency.getValue(),
			currentUserBalance: item.currentUserBalance,
			createdAt: group.createdAt?.toISOString(),
			updatedAt: group.updatedAt?.toISOString(),
		};
	}

	static toDetailResponseDto(
		group: GroupEntity,
		userId: string,
	): CreateGroupResponseDto {
		return {
			id: group.id,
			name: group.name.getValue(),
			description: group.description,
			currency: group.currency.getValue(),
			members: group.members.map((member) =>
				GroupMapper.toMemberResponseDto(member, userId),
			),
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

	static toBalancesResponseDto(balances: MemberBalance[]): GroupBalancesResponseDto {
		return {
			balances: balances.map((b) => ({
				memberId: b.memberId,
				displayName: b.displayName,
				balance: b.balance,
				currency: b.currency,
			})),
		};
	}

	static toSettlementsResponseDto(settlements: SettlementSuggestion[]): GroupSettlementsResponseDto {
		return {
			settlements: settlements.map((s) => ({
				fromMemberId: s.fromMemberId,
				fromMemberName: s.fromMemberName,
				toMemberId: s.toMemberId,
				toMemberName: s.toMemberName,
				amount: s.amount,
				currency: s.currency,
			})),
		};
	}

	static toRecordSettlementPaymentResponseDto(
		result: RecordSettlementPaymentResult,
	): RecordSettlementPaymentResponseDto {
		return {
			payment: {
				id: result.payment.id,
				groupId: result.payment.groupId,
				fromMember: result.payment.fromMember,
				toMember: result.payment.toMember,
				amount: result.payment.amount,
				currency: result.payment.currency,
				paidAt: result.payment.paidAt.toISOString(),
				notes: result.payment.notes,
				createdAt: result.payment.createdAt.toISOString(),
			},
			balances: result.balances.map((balance) => ({
				memberId: balance.memberId,
				displayName: balance.displayName,
				balance: balance.balance,
				currency: balance.currency,
			})),
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

	private static toMemberResponseDto(
		member: GroupMemberEntity,
		userId: string,
	): NonNullable<CreateGroupResponseDto["members"]>[number] {
		return {
			id: member.id,
			displayName: member.displayName,
			email: member.getEmailValue() ?? undefined,
			isCurrentUser: member.isCurrentUser(userId),
			removedAt: member.removedAt?.toISOString() ?? null,
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
