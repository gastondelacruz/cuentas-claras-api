import { Injectable } from "@nestjs/common";
import { GroupType as PrismaGroupType, type Prisma } from "@prisma/client";
import type {
	GroupMemberRef,
	GroupLedger,
	RecordSettlementPaymentPayload,
	SettlementPaymentRef,
	UpdateGroupPayload,
} from "../../domain/ports/group.repository";
import { GroupEntity } from "../../domain/entities/group-entity";
import { GroupMemberEntity } from "../../domain/entities/group-member-entity";
import { Currency } from "../../domain/value-objects/currency.vo";
import type { GroupType } from "../../domain/value-objects/group-type.vo";
import { GroupName } from "../../domain/value-objects/group-name.vo";
import { PrismaService } from "../../../prisma/prisma.service";
import { DatabaseException } from "../../../shared/exceptions/database.exception";
import { GroupRepository } from "../../domain/ports/group.repository";

@Injectable()
export class PrismaGroupRepository extends GroupRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

	async createForUser(
		userId: string,
		payload: GroupEntity,
	): Promise<GroupEntity> {
		return this.runDatabaseOperation("GROUP_CREATE_DATABASE_ERROR", () =>
			this.prisma.$transaction(async (tx) => {
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
      const domainGroup = new GroupEntity({
        id: "pending",
        name: payload.name,
        description: payload.description ?? null,
        type: payload.type,
        currency: payload.currency,
        members: [
          new GroupMemberEntity({
            id: "creator",
            displayName: user.name,
            email: user.email,
            userId: user.id,
          }),
          ...(payload.members ?? []).map(
            (member, index) =>
              new GroupMemberEntity({
                id: `invited-${index}`,
                displayName: member.displayName,
                email: member.email ?? null,
                userId: null,
              }),
          ),
        ],
      });

		const group = await tx.group.create({
			data: {
				ownerUserId: user.id,
				name: domainGroup.name.getValue(),
				description: domainGroup.description,
				type: toPrismaGroupType(domainGroup.type),
				currency: domainGroup.currency.getValue(),
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

      const invitedMembers = domainGroup.members.filter(
        (member) => !member.isCurrentUser(user.id),
      );

      if (invitedMembers.length > 0) {
        await tx.groupMember.createMany({
          data: invitedMembers.map((member) => ({
            groupId: group.id,
            userId: null,
            displayName: member.displayName,
            email: member.getEmailValue(),
          })),
        });
      }

			return this.loadGroupSummary(tx, group.id);
			}),
		);
	}

	async listByUser(userId: string): Promise<GroupEntity[]> {
		return this.runDatabaseOperation("GROUP_LIST_DATABASE_ERROR", async () => {
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
        type: true,
        description: true,
        currency: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: "desc",
			},
		});

			return groups.map(
				(group) =>
					new GroupEntity({
						id: group.id,
						name: group.name,
						description: group.description,
						type: fromPrismaGroupType(group.type),
						currency: group.currency,
						createdAt: group.createdAt,
						updatedAt: group.updatedAt,
					}),
			);
		});
	}

	async findDetailByIdAndOwner(
		groupId: string,
		ownerUserId: string,
	): Promise<GroupEntity | null> {
		return this.runDatabaseOperation("GROUP_DETAIL_DATABASE_ERROR", async () => {
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

			return new GroupEntity({
				id: group.id,
				name: group.name,
				description: group.description,
			type: fromPrismaGroupType(group.type),
				currency: group.currency,
				createdAt: group.createdAt,
				updatedAt: group.updatedAt,
				members: group.groupMembers.map(
					(member) =>
						new GroupMemberEntity({
							id: member.id,
							displayName: member.displayName,
							email: member.email,
							userId: member.userId,
							removedAt: member.removedAt,
						}),
				),
			});
		});
	}

	async updateByIdAndOwner(
		groupId: string,
		ownerUserId: string,
		payload: UpdateGroupPayload,
	): Promise<GroupEntity | null> {
		return this.runDatabaseOperation("GROUP_UPDATE_DATABASE_ERROR", () =>
			this.updateByIdAndOwnerUnsafe(groupId, ownerUserId, payload),
		);
	}

	private async updateByIdAndOwnerUnsafe(
		groupId: string,
		ownerUserId: string,
		payload: UpdateGroupPayload,
	): Promise<GroupEntity | null> {
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

			await this.replaceGroupMembers(tx, group.id, ownerUserId, members);

        return this.loadGroupSummary(tx, group.id);
      });
    }

    const group = await this.findAccessibleGroup(
      this.prisma,
      groupId,
      ownerUserId,
    );

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
	): Promise<GroupEntity | null> {
		return this.runDatabaseOperation("GROUP_ARCHIVE_DATABASE_ERROR", async () => {
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
			select: { id: true },
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
			include: {
				groupMembers: true,
			},
		});

			return toDomainGroup(archivedGroup);
		});
	}

	async findGroupLedgerForUser(input: {
		groupId: string;
		userId: string;
	}): Promise<GroupLedger | null> {
		return this.runDatabaseOperation(
			"GROUP_BALANCES_DATABASE_ERROR",
			async () => {
				const group = await this.prisma.group.findFirst({
					where: {
						id: input.groupId,
						archivedAt: null,
						groupMembers: {
							some: {
								userId: input.userId,
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

				const [members, splits, settlements] = await Promise.all([
					this.prisma.groupMember.findMany({
						where: {
							groupId: input.groupId,
						},
						select: {
							id: true,
							displayName: true,
						},
					}),
					this.prisma.expenseSplit.findMany({
						where: {
							expense: {
								groupId: input.groupId,
								deletedAt: null,
							},
						},
						select: {
							memberId: true,
							netAmount: true,
							expense: {
								select: {
									currency: true,
								},
							},
						},
					}),
					this.prisma.settlementPayment.findMany({
						where: {
							groupId: input.groupId,
							deletedAt: null,
						},
						select: {
							fromMemberId: true,
							toMemberId: true,
							amount: true,
							currency: true,
						},
					}),
				]);

				return {
					members: members.map((member) => ({
						memberId: member.id,
						displayName: member.displayName,
					})),
					splits: splits.map((split) => ({
						memberId: split.memberId,
						netAmount: decimalToNumber(split.netAmount),
						currency: split.expense.currency,
					})),
					settlements: settlements.map((settlement) => ({
						fromMemberId: settlement.fromMemberId,
						toMemberId: settlement.toMemberId,
						amount: decimalToNumber(settlement.amount),
						currency: settlement.currency,
					})),
				};
			},
		);
	}

	async findActiveGroupMembersForUser(input: {
		groupId: string;
		userId: string;
	}): Promise<GroupMemberRef[] | null> {
		return this.runDatabaseOperation(
			"GROUP_MEMBERS_DATABASE_ERROR",
			async () => {
				const group = await this.prisma.group.findFirst({
					where: {
						id: input.groupId,
						archivedAt: null,
						groupMembers: {
							some: {
								userId: input.userId,
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

				const members = await this.prisma.groupMember.findMany({
					where: {
						groupId: input.groupId,
						removedAt: null,
					},
					select: {
						id: true,
						displayName: true,
					},
					orderBy: {
						createdAt: "asc",
					},
				});

				return members.map((member) => ({
					memberId: member.id,
					displayName: member.displayName,
				}));
			},
		);
	}

	async recordSettlementPayment(
		payload: RecordSettlementPaymentPayload,
	): Promise<SettlementPaymentRef> {
		return this.runDatabaseOperation("SETTLEMENT_CREATE_DATABASE_ERROR", async () => {
			const created = await this.prisma.settlementPayment.create({
				data: {
					groupId: payload.groupId,
					fromMemberId: payload.fromMemberId,
					toMemberId: payload.toMemberId,
					amount: payload.amount.toFixed(2),
					currency: payload.currency,
					paidAt: payload.paidAt,
					notes: payload.notes,
				},
				select: {
					id: true,
					groupId: true,
					amount: true,
					currency: true,
					paidAt: true,
					notes: true,
					createdAt: true,
					fromMember: {
						select: {
							id: true,
							displayName: true,
						},
					},
					toMember: {
						select: {
							id: true,
							displayName: true,
						},
					},
				},
			});

			return {
				id: created.id,
				groupId: created.groupId,
				fromMember: {
					id: created.fromMember.id,
					displayName: created.fromMember.displayName,
				},
				toMember: {
					id: created.toMember.id,
					displayName: created.toMember.displayName,
				},
				amount: decimalToNumber(created.amount),
				currency: created.currency,
				paidAt: created.paidAt,
				notes: created.notes,
				createdAt: created.createdAt,
			};
		});
	}

	private async runDatabaseOperation<T>(
		code: string,
		operation: () => Promise<T>,
	): Promise<T> {
		try {
			return await operation();
		} catch (error) {
			if (error instanceof DatabaseException) {
				throw error;
			}

			throw new DatabaseException(code);
		}
	}

	private toUpdateData(payload: UpdateGroupPayload): Prisma.GroupUpdateInput {
		const data: Prisma.GroupUpdateInput = {};

		if (payload.name !== undefined) {
			data.name = normalizeGroupName(payload.name);
		}

    if (payload.description !== undefined) {
      data.description = payload.description;
    }

    if (payload.type !== undefined) {
      data.type = toPrismaGroupType(payload.type);
    }

		if (payload.currency !== undefined) {
			data.currency = normalizeCurrency(payload.currency);
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
		currentUserId: string,
		members: NonNullable<GroupMemberEntity[]>,
	) {
		await this.assertReplacementMembersAreValid(
			client,
			groupId,
			currentUserId,
			members,
		);

    const replaceableMembers = await client.groupMember.findMany({
      where: {
        groupId,
				OR: [{ userId: null }, { userId: { not: currentUserId } }],
      },
      orderBy: [{ removedAt: "asc" }, { createdAt: "asc" }],
    });

    const membersByEmail = new Map<string, typeof replaceableMembers>();

    for (const member of replaceableMembers) {
      if (!member.email) {
        continue;
      }

      const email = new GroupMemberEntity({
        id: member.id,
        displayName: member.displayName,
        email: member.email,
      }).getEmailValue();

      if (!email) {
        continue;
      }

      const existingMembers = membersByEmail.get(email) ?? [];
      existingMembers.push(member);
      membersByEmail.set(email, existingMembers);
    }

    const matchedMemberIds = new Set<string>();
    const now = new Date();

    for (const member of members) {
      const normalizedEmail = member.email
        ? new GroupMemberEntity({
            id: "replacement",
            displayName: member.displayName,
            email: member.email,
          }).getEmailValue()
        : null;
      const matchedMember = normalizedEmail
        ? (membersByEmail.get(normalizedEmail) ?? []).find(
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
            email: normalizedEmail,
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
          email: normalizedEmail,
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

	private async assertReplacementMembersAreValid(
		client: Prisma.TransactionClient,
		groupId: string,
		currentUserId: string,
		members: NonNullable<GroupMemberEntity[]>,
	): Promise<void> {
    const [group, currentMembers] = await Promise.all([
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
          createdAt: true,
          updatedAt: true,
        },
      }),
      client.groupMember.findMany({
        where: {
          groupId,
          removedAt: null,
        },
      }),
    ]);

    const domainGroup = new GroupEntity({
      id: group.id,
      name: group.name,
      description: group.description,
      type: fromPrismaGroupType(group.type),
      currency: group.currency,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      members: currentMembers.map(
        (member) =>
          new GroupMemberEntity({
            id: member.id,
            displayName: member.displayName,
            email: member.email,
            userId: member.userId,
            removedAt: member.removedAt,
          }),
      ),
    });

    domainGroup.replaceInvitedMembers(
      members.map(
        (member, index) =>
          new GroupMemberEntity({
            id: `replacement-${index}`,
            displayName: member.displayName,
            email: member.email ?? null,
            userId: null,
          }),
      ),
		currentUserId,
	);
}

  private async loadGroupSummary(
    client: PrismaClientLike,
    groupId: string,
  ): Promise<GroupEntity> {
		const [group, members] = await Promise.all([
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
					createdAt: true,
					updatedAt: true,
				},
			}),
			client.groupMember.findMany({
				where: {
					groupId,
					removedAt: null,
				},
				orderBy: {
					createdAt: "asc",
				},
			}),
		]);

		return new GroupEntity({
      id: group.id,
      name: group.name,
      description: group.description,
			type: fromPrismaGroupType(group.type),
			currency: group.currency,
			createdAt: group.createdAt,
			updatedAt: group.updatedAt,
			members: members.map(toDomainGroupMember),
		});
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

function decimalToNumber(value: unknown): number {
	if (typeof value === "object" && value !== null && "toNumber" in value) {
		return (value as { toNumber: () => number }).toNumber();
	}

	return Number(value);
}

function normalizeGroupName(name: GroupName | string): string {
	return name instanceof GroupName ? name.getValue() : new GroupName(name).getValue();
}

function normalizeCurrency(currency: Currency | string): string {
	return currency instanceof Currency
		? currency.getValue()
		: new Currency(currency).getValue();
}

function toDomainGroupMember(member: {
	id: string;
	displayName: string;
	email: string | null;
	userId: string | null;
	removedAt: Date | null;
}): GroupMemberEntity {
	return new GroupMemberEntity({
		id: member.id,
		displayName: member.displayName,
		email: member.email,
		userId: member.userId,
		removedAt: member.removedAt,
	});
}

function toDomainGroup(group: {
	id: string;
	name: string;
	description: string | null;
	type: PrismaGroupType;
	currency: string;
	createdAt: Date;
	updatedAt: Date;
	archivedAt: Date | null;
	groupMembers: Array<{
		id: string;
		displayName: string;
		email: string | null;
		userId: string | null;
		removedAt: Date | null;
	}>;
}): GroupEntity {
	return new GroupEntity({
		id: group.id,
		name: group.name,
		description: group.description,
		type: fromPrismaGroupType(group.type),
		currency: group.currency,
		createdAt: group.createdAt,
		updatedAt: group.updatedAt,
		archivedAt: group.archivedAt,
		members: group.groupMembers.map(toDomainGroupMember),
	});
}
