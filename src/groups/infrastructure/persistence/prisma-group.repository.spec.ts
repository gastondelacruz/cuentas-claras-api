import { DatabaseException } from "../../../shared/exceptions/database.exception";
import { PrismaGroupRepository } from "./prisma-group.repository";

describe("PrismaGroupRepository", () => {
	it("wraps list database failures in a safe DatabaseException", async () => {
		const prisma = {
			group: {
				findMany: vi.fn().mockRejectedValue(new Error("raw database failure")),
			},
		};
		const repository = new PrismaGroupRepository(prisma as never);

		await expect(repository.listByUser("user-1")).rejects.toMatchObject({
			code: "GROUP_LIST_DATABASE_ERROR",
			message: "A database error occurred.",
			statusCode: 500,
			type: "database",
		});
		await expect(repository.listByUser("user-1")).rejects.toBeInstanceOf(
			DatabaseException,
		);
	});

	it("wraps create transaction failures in a safe DatabaseException", async () => {
		const prisma = {
			$transaction: vi.fn().mockRejectedValue(new Error("raw prisma error")),
		};
		const repository = new PrismaGroupRepository(prisma as never);

		await expect(
			repository.createForUser("user-1", {} as never),
		).rejects.toMatchObject({
			code: "GROUP_CREATE_DATABASE_ERROR",
			message: "A database error occurred.",
			type: "database",
		});
	});

	it("wraps balance ledger database failures in a safe DatabaseException", async () => {
		const prisma = {
			group: {
				findFirst: vi
					.fn()
					.mockRejectedValue(new Error("raw database failure")),
			},
		};
		const repository = new PrismaGroupRepository(prisma as never);

		await expect(
			repository.findGroupLedgerForUser({
				groupId: "group-1",
				userId: "user-1",
			}),
		).rejects.toMatchObject({
			code: "GROUP_BALANCES_DATABASE_ERROR",
			message: "A database error occurred.",
			statusCode: 500,
			type: "database",
		});
		await expect(
			repository.findGroupLedgerForUser({
				groupId: "group-1",
				userId: "user-1",
			}),
		).rejects.toBeInstanceOf(DatabaseException);
	});

	it("wraps active group member lookup failures in a safe DatabaseException", async () => {
		const prisma = {
			group: {
				findFirst: vi
					.fn()
					.mockRejectedValue(new Error("raw database failure")),
			},
		};
		const repository = new PrismaGroupRepository(prisma as never);

		await expect(
			repository.findActiveGroupMembersForUser({
				groupId: "group-1",
				userId: "user-1",
			}),
		).rejects.toMatchObject({
			code: "GROUP_MEMBERS_DATABASE_ERROR",
			message: "A database error occurred.",
			statusCode: 500,
			type: "database",
		});
	});

	it("wraps settlement payment create failures in a safe DatabaseException", async () => {
		const prisma = {
			settlementPayment: {
				create: vi.fn().mockRejectedValue(new Error("raw database failure")),
			},
		};
		const repository = new PrismaGroupRepository(prisma as never);

		await expect(
			repository.recordSettlementPayment({
				groupId: "group-1",
				fromMemberId: "from-member",
				toMemberId: "to-member",
				amount: 15000,
				currency: "ARS",
				paidAt: new Date("2026-06-15T12:00:00.000Z"),
				notes: null,
			}),
		).rejects.toMatchObject({
			code: "SETTLEMENT_CREATE_DATABASE_ERROR",
			message: "A database error occurred.",
			statusCode: 500,
			type: "database",
		});
	});
});
