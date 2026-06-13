import { Injectable } from "@nestjs/common";
import { GroupType as PrismaGroupType, type Prisma } from "@prisma/client";
import type { CreateGroupPayload } from "../../domain/entities/create-group-payload";
import type { GroupDetail } from "../../domain/entities/group-detail";
import type { GroupType } from "../../domain/entities/group-type";
import type { GroupListItem } from "../../domain/entities/group-list-item";
import type { UpdateGroupPayload } from "../../domain/entities/update-group-payload";
import {
	type ArchivedGroup,
	type CreatedGroupSummary,
	type GroupSummary,
	GroupRepository,
} from "../../domain/ports/group.repository";
import { DEV_USER_ID } from "../../../shared/constants/dev-user";
import { PrismaService } from "../../../prisma/prisma.service";

@Injectable()
export class PrismaGroupRepository extends GroupRepository {
	constructor(private readonly prisma: PrismaService) {
		super();
	}

	async createForUser(
		userId: string,
		payload: CreateGroupPayload,
	): Promise<CreatedGroupSummary> {
		return this.prisma.$transaction(async (tx) => {
			const user = await tx.user.findUniqueOrThrow({
				where: {
					id: userId,
				},
				select: {
					id: true,
					name: true,
					email: true,
				},
			});

			const group = await tx.group.create({
				data: {
					ownerUserId: user.id,
					name: payload.name,
					description: payload.description ?? null,
					type: toPrismaGroupType(payload.type),
					currency: payload.currency,
				},
				select: {
					id: true,
					name: true,
					description: true,
					type: true,
					currency: true,
					createdAt: true,
					updatedAt: true,
				},
			});

			await tx.groupMember.create({
				data: {
					groupId: group.id,
					userId: user.id,
					displayName: user.name,
					email: user.email,
				},
			});

			if (payload.members && payload.members.length > 0) {
				await tx.groupMember.createMany({
					data: payload.members.map((member) => ({
						groupId: group.id,
						userId: null,
						displayName: member.displayName,
						email: member.email ?? null,
					})),
				});
			}

			return {
				id: group.id,
				name: group.name,
				description: group.description,
				type: fromPrismaGroupType(group.type),
				currency: group.currency,
				membersCount: (payload.members?.length ?? 0) + 1,
				expensesCount: 0,
				totalAmount: 0,
				currentUserBalance: 0,
				createdAt: group.createdAt,
				updatedAt: group.updatedAt,
			};
		});
	}

	async listByUser(userId: string): Promise<GroupListItem[]> {
		const groups = await this.prisma.group.findMany({
			where: {
				archivedAt: null,
				groupMembers: {
					some: {
						userId,
						removedAt: null,
					},
				},
			},
			select: {
				id: true,
				name: true,
				description: true,
				currency: true,
				createdAt: true,
				updatedAt: true,
			},
			orderBy: {
				updatedAt: "desc",
			},
		});

		return groups;
	}

	async findDetailByIdAndOwner(
		groupId: string,
		ownerUserId: string,
	): Promise<GroupDetail | null> {
		const group = await this.prisma.group.findFirst({
			where: {
				id: groupId,
				archivedAt: null,
				groupMembers: {
					some: {
						userId: ownerUserId,
						removedAt: null,
					},
				},
			},
			include: {
				groupMembers: {
					where: {
						removedAt: null,
					},
					orderBy: {
						createdAt: "asc",
					},
				},
			},
		});

		if (!group) {
			return null;
		}

		return {
			id: group.id,
			name: group.name,
			description: group.description,
			currency: group.currency,
			members: group.groupMembers.map((member) => ({
				id: member.id,
				displayName: member.displayName,
				email: member.email,
				isCurrentUser: member.userId === DEV_USER_ID,
				removedAt: member.removedAt,
			})),
			expenses: [],
			balances: [],
			createdAt: group.createdAt,
			updatedAt: group.updatedAt,
		};
	}

	async updateByIdAndOwner(
		groupId: string,
		ownerUserId: string,
		payload: UpdateGroupPayload,
	): Promise<GroupSummary | null> {
		if (payload.members !== undefined) {
			const members = payload.members;

			return this.prisma.$transaction(async (tx) => {
				const group = await this.findAccessibleGroup(tx, groupId, ownerUserId);

				if (!group) {
					return null;
				}

				await tx.group.update({
					where: {
						id: group.id,
					},
					data: this.toUpdateData(payload),
				});

				await this.replaceGroupMembers(tx, group.id, members);

				return this.loadGroupSummary(tx, group.id);
			});
		}

		const group = await this.findAccessibleGroup(this.prisma, groupId, ownerUserId);

		if (!group) {
			return null;
		}

		await this.prisma.group.update({
			where: {
				id: group.id,
			},
			data: this.toUpdateData(payload),
		});

		return this.loadGroupSummary(this.prisma, group.id);
	}

	async archiveByIdAndOwner(
		groupId: string,
		ownerUserId: string,
	): Promise<ArchivedGroup | null> {
		const group = await this.prisma.group.findFirst({
			where: {
				id: groupId,
				archivedAt: null,
				groupMembers: {
					some: {
						userId: ownerUserId,
						removedAt: null,
					},
				},
			},
			select: {
				id: true,
			},
		});

		if (!group) {
			return null;
		}

		const archivedGroup = await this.prisma.group.update({
			where: {
				id: group.id,
			},
			data: {
				archivedAt: new Date(),
			},
			select: {
				id: true,
				archivedAt: true,
			},
		});

		if (!archivedGroup.archivedAt) {
			return null;
		}

		return {
			id: archivedGroup.id,
			archivedAt: archivedGroup.archivedAt,
		};
	}

	private toUpdateData(payload: UpdateGroupPayload): Prisma.GroupUpdateInput {
		const data: Prisma.GroupUpdateInput = {};

		if (payload.name !== undefined) {
			data.name = payload.name;
		}

		if (payload.description !== undefined) {
			data.description = payload.description;
		}

		if (payload.type !== undefined) {
			data.type = toPrismaGroupType(payload.type);
		}

		if (payload.currency !== undefined) {
			data.currency = payload.currency;
		}

		return data;
	}

	private async findAccessibleGroup(
		client: PrismaClientLike,
		groupId: string,
		userId: string,
	) {
		return client.group.findFirst({
			where: {
				id: groupId,
				archivedAt: null,
				groupMembers: {
					some: {
						userId,
						removedAt: null,
					},
				},
			},
			select: {
				id: true,
			},
		});
	}

	private async replaceGroupMembers(
		client: Prisma.TransactionClient,
		groupId: string,
		members: NonNullable<UpdateGroupPayload["members"]>,
	) {
		const replaceableMembers = await client.groupMember.findMany({
			where: {
				groupId,
				OR: [{ userId: null }, { userId: { not: DEV_USER_ID } }],
			},
			orderBy: [{ removedAt: "asc" }, { createdAt: "asc" }],
		});

		const membersByEmail = new Map<string, typeof replaceableMembers>();

		for (const member of replaceableMembers) {
			if (!member.email) {
				continue;
			}

			const existingMembers = membersByEmail.get(member.email) ?? [];
			existingMembers.push(member);
			membersByEmail.set(member.email, existingMembers);
		}

		const matchedMemberIds = new Set<string>();
		const now = new Date();

		for (const member of members) {
			const matchedMember = member.email
				? (membersByEmail.get(member.email) ?? []).find(
					(candidate) => !matchedMemberIds.has(candidate.id),
				)
				: undefined;

			if (matchedMember) {
				await client.groupMember.update({
					where: {
						id: matchedMember.id,
					},
					data: {
						displayName: member.displayName,
						email: member.email ?? null,
						removedAt: null,
					},
				});
				matchedMemberIds.add(matchedMember.id);
				continue;
			}

			const createdMember = await client.groupMember.create({
				data: {
					groupId,
					userId: null,
					displayName: member.displayName,
					email: member.email ?? null,
					removedAt: null,
				},
				select: {
					id: true,
				},
			});
			matchedMemberIds.add(createdMember.id);
		}

		const memberIdsToRemove = replaceableMembers
			.filter(
				(member) =>
					member.removedAt === null && !matchedMemberIds.has(member.id),
			)
			.map((member) => member.id);

		if (memberIdsToRemove.length > 0) {
			await client.groupMember.updateMany({
				where: {
					id: {
						in: memberIdsToRemove,
					},
				},
				data: {
					removedAt: now,
				},
			});
		}
	}

	private async loadGroupSummary(
		client: PrismaClientLike,
		groupId: string,
	): Promise<GroupSummary> {
		const [group, membersCount] = await Promise.all([
			client.group.findUniqueOrThrow({
				where: {
					id: groupId,
				},
				select: {
					id: true,
					name: true,
					description: true,
					type: true,
					currency: true,
					updatedAt: true,
				},
			}),
			client.groupMember.count({
				where: {
					groupId,
					removedAt: null,
				},
			}),
		]);

		return {
			id: group.id,
			name: group.name,
			description: group.description,
			type: fromPrismaGroupType(group.type),
			currency: group.currency,
			membersCount,
			expensesCount: 0,
			totalAmount: 0,
			currentUserBalance: 0,
			updatedAt: group.updatedAt,
		};
	}
}

type PrismaClientLike = Prisma.TransactionClient | PrismaService;

function toPrismaGroupType(groupType: GroupType): PrismaGroupType {
	const mapping: Record<GroupType, PrismaGroupType> = {
		trip: PrismaGroupType.TRIP,
		home: PrismaGroupType.HOME,
		couple: PrismaGroupType.COUPLE,
		friends: PrismaGroupType.FRIENDS,
		event: PrismaGroupType.EVENT,
		other: PrismaGroupType.OTHER,
	};

	return mapping[groupType];
}

function fromPrismaGroupType(groupType: PrismaGroupType): GroupType {
	const mapping: Record<PrismaGroupType, GroupType> = {
		[PrismaGroupType.TRIP]: "trip",
		[PrismaGroupType.HOME]: "home",
		[PrismaGroupType.COUPLE]: "couple",
		[PrismaGroupType.FRIENDS]: "friends",
		[PrismaGroupType.EVENT]: "event",
		[PrismaGroupType.OTHER]: "other",
	};

	return mapping[groupType];
}
