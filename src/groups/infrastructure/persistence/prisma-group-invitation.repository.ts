import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { DatabaseException } from "../../../shared/exceptions/database.exception";
import {
	GroupInvitationRepository,
	type GroupInvitationTokenRecord,
	type SaveGroupInvitationTokenInput,
} from "../../domain/ports/group-invitation.repository";

@Injectable()
export class PrismaGroupInvitationRepository extends GroupInvitationRepository {
	constructor(private readonly prisma: PrismaService) {
		super();
	}

	async save(input: SaveGroupInvitationTokenInput): Promise<void> {
		await this.runDatabaseOperation("GROUP_INVITATION_CREATE_DATABASE_ERROR", async () => {
			await this.prisma.groupInvitationToken.create({ data: input });
		});
	}

	async invalidateActiveForMember(groupMemberId: string, invalidatedAt: Date): Promise<void> {
		await this.runDatabaseOperation("GROUP_INVITATION_INVALIDATE_DATABASE_ERROR", async () => {
			await this.prisma.groupInvitationToken.updateMany({
				where: {
					groupMemberId,
					consumedAt: null,
					expiresAt: {
						gt: invalidatedAt,
					},
				},
				data: { consumedAt: invalidatedAt },
			});
		});
	}

	findByDigest(tokenDigest: string): Promise<GroupInvitationTokenRecord | null> {
		return this.runDatabaseOperation("GROUP_INVITATION_FIND_DATABASE_ERROR", () =>
			this.prisma.groupInvitationToken.findUnique({
				where: { tokenDigest },
				select: {
					id: true,
					groupMemberId: true,
					email: true,
					tokenDigest: true,
					expiresAt: true,
					consumedAt: true,
					groupMember: {
						select: {
							id: true,
							userId: true,
							groupId: true,
						},
					},
				},
			}),
		);
	}

	async accept(input: {
		invitationId: string;
		groupMemberId: string;
		userId: string;
		consumedAt: Date;
	}): Promise<boolean> {
		try {
			return await this.prisma.$transaction(async (tx) => {
				const consumed = await tx.groupInvitationToken.updateMany({
					where: {
						id: input.invitationId,
						consumedAt: null,
					},
					data: { consumedAt: input.consumedAt },
				});

				if (consumed.count !== 1) {
					return false;
				}

				const linked = await tx.groupMember.updateMany({
					where: {
						id: input.groupMemberId,
						userId: null,
					},
					data: { userId: input.userId },
				});

				if (linked.count !== 1) {
					throw new GroupInvitationAcceptRaceError();
				}

				return true;
			});
		} catch (error) {
			if (error instanceof GroupInvitationAcceptRaceError) {
				return false;
			}

			throw new DatabaseException("GROUP_INVITATION_ACCEPT_DATABASE_ERROR");
		}
	}

	private async runDatabaseOperation<T>(code: string, operation: () => Promise<T>): Promise<T> {
		try {
			return await operation();
		} catch {
			throw new DatabaseException(code);
		}
	}
}

class GroupInvitationAcceptRaceError extends Error {}
