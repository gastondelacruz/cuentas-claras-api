import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { DatabaseException } from "../../../shared/exceptions/database.exception";
import {
	MeSummaryRepository,
	type MeSummaryRawInputs,
} from "../../domain/ports/me-summary.repository";

@Injectable()
export class PrismaMeSummaryRepository extends MeSummaryRepository {
	constructor(private readonly prisma: PrismaService) {
		super();
	}

	async getRawSummaryInputsForUser(userId: string): Promise<MeSummaryRawInputs> {
		return this.runDatabaseOperation("ME_SUMMARY_DATABASE_ERROR", async () => {
			const activeMemberships = await this.prisma.groupMember.findMany({
				where: {
					userId,
					removedAt: null,
					group: {
						archivedAt: null,
					},
				},
				select: {
					id: true,
					groupId: true,
					createdAt: true,
				},
			});

			if (activeMemberships.length === 0) {
				return emptyRawInputs();
			}

			const groupIds = [...new Set(activeMemberships.map((member) => member.groupId))];
			const memberIds = activeMemberships.map((member) => member.id);
			const memberIdsSet = new Set(memberIds);

			const [totalExpenses, paidExpenses, splits, settlements] = await Promise.all([
				this.prisma.expense.count({
					where: {
						groupId: {
							in: groupIds,
						},
						deletedAt: null,
					},
				}),
				this.prisma.expense.findMany({
					where: {
						groupId: {
							in: groupIds,
						},
						paidByMemberId: {
							in: memberIds,
						},
						deletedAt: null,
					},
					select: {
						currency: true,
						amount: true,
					},
				}),
				this.prisma.expenseSplit.findMany({
					where: {
						memberId: {
							in: memberIds,
						},
						expense: {
							groupId: {
								in: groupIds,
							},
							deletedAt: null,
						},
					},
					select: {
						expense: {
							select: {
								currency: true,
							},
						},
						netAmount: true,
					},
				}),
				this.prisma.settlementPayment.findMany({
					where: {
						groupId: {
							in: groupIds,
						},
						deletedAt: null,
						OR: [
							{
								fromMemberId: {
									in: memberIds,
								},
							},
							{
								toMemberId: {
									in: memberIds,
								},
							},
						],
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
				totalGroups: groupIds.length,
				totalExpenses,
				memberships: activeMemberships.map((m) => ({ createdAt: m.createdAt })),
				paidExpenses: paidExpenses.map((paidExpense) => ({
					currency: paidExpense.currency,
					amount: decimalToNumber(paidExpense.amount),
				})),
				splits: splits.map((split) => ({
					currency: split.expense.currency,
					netAmount: decimalToNumber(split.netAmount),
				})),
				settlements: settlements.flatMap((settlement) => {
					const movements: Array<{
						currency: string;
						amount: number;
						direction: "incoming" | "outgoing";
					}> = [];

					if (memberIdsSet.has(settlement.fromMemberId)) {
						movements.push({
							currency: settlement.currency,
							amount: decimalToNumber(settlement.amount),
							direction: "outgoing",
						});
					}

					if (memberIdsSet.has(settlement.toMemberId)) {
						movements.push({
							currency: settlement.currency,
							amount: decimalToNumber(settlement.amount),
							direction: "incoming",
						});
					}

					return movements;
				}),
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
}

function emptyRawInputs(): MeSummaryRawInputs {
	return {
		totalGroups: 0,
		totalExpenses: 0,
		memberships: [],
		paidExpenses: [],
		splits: [],
		settlements: [],
	};
}

function decimalToNumber(value: unknown): number {
	if (value === null || value === undefined) {
		return 0;
	}

	if (typeof value === "object" && "toNumber" in value) {
		return (value as { toNumber: () => number }).toNumber();
	}

	return Number(value);
}
