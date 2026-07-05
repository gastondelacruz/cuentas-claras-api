import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { DatabaseException } from "../../../shared/exceptions/database.exception";
import { GroupMemberUserResolver } from "../../domain/ports/group-member-user-resolver";

@Injectable()
export class PrismaGroupMemberUserResolver extends GroupMemberUserResolver {
	constructor(private readonly prisma: PrismaService) {
		super();
	}

	async resolveByEmails(emails: string[]): Promise<Map<string, string>> {
		const uniqueEmails = [...new Set(emails)];

		if (uniqueEmails.length === 0) {
			return new Map();
		}

		try {
			const users = await this.prisma.user.findMany({
				where: {
					email: {
						in: uniqueEmails,
					},
				},
				select: {
					id: true,
					email: true,
				},
			});

			return new Map(users.map((user) => [user.email, user.id]));
		} catch (error) {
			if (error instanceof DatabaseException) {
				throw error;
			}

			throw new DatabaseException("GROUP_MEMBER_USER_RESOLVE_DATABASE_ERROR");
		}
	}
}
