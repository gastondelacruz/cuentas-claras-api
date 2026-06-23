import { Test, type TestingModule } from "@nestjs/testing";
import { BusinessException } from "../../../shared/exceptions/business.exception";
import { GroupRepository } from "../../domain/ports/group.repository";
import { RecordSettlementPaymentUseCase } from "./record-settlement-payment.use-case";

describe("RecordSettlementPaymentUseCase", () => {
	let useCase: RecordSettlementPaymentUseCase;
	let repository: {
		findActiveGroupMembersForUser: ReturnType<typeof vi.fn>;
		recordSettlementPayment: ReturnType<typeof vi.fn>;
		findGroupLedgerForUser: ReturnType<typeof vi.fn>;
	};

	const paidAt = new Date("2026-06-15T12:00:00.000Z");

	beforeEach(async () => {
		repository = {
			findActiveGroupMembersForUser: vi.fn(),
			recordSettlementPayment: vi.fn(),
			findGroupLedgerForUser: vi.fn(),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				RecordSettlementPaymentUseCase,
				{
					provide: GroupRepository,
					useValue: repository,
				},
			],
		}).compile();

		useCase = module.get(RecordSettlementPaymentUseCase);
	});

	it("records a settlement payment and returns updated balances", async () => {
		repository.findActiveGroupMembersForUser.mockResolvedValue([
			{ memberId: "from-member", displayName: "Ana" },
			{ memberId: "to-member", displayName: "Gaston" },
		]);
		repository.recordSettlementPayment.mockResolvedValue({
			id: "payment-1",
			groupId: "group-1",
			fromMember: { id: "from-member", displayName: "Ana" },
			toMember: { id: "to-member", displayName: "Gaston" },
			amount: 15000,
			currency: "ARS",
			paidAt,
			notes: "Paid by transfer",
			createdAt: paidAt,
		});
		repository.findGroupLedgerForUser.mockResolvedValue({
			members: [
				{ memberId: "from-member", displayName: "Ana" },
				{ memberId: "to-member", displayName: "Gaston" },
			],
			splits: [
				{ memberId: "to-member", netAmount: 15000, currency: "ARS" },
				{ memberId: "from-member", netAmount: -15000, currency: "ARS" },
			],
			settlements: [
				{
					fromMemberId: "from-member",
					toMemberId: "to-member",
					amount: 15000,
					currency: "ARS",
				},
			],
		});

		await expect(
			useCase.execute("user-1", {
				groupId: "group-1",
				fromMemberId: "from-member",
				toMemberId: "to-member",
				amount: 15000,
				currency: "ARS",
				paidAt,
				notes: "Paid by transfer",
			}),
		).resolves.toEqual({
			payment: {
				id: "payment-1",
				groupId: "group-1",
				fromMember: { id: "from-member", displayName: "Ana" },
				toMember: { id: "to-member", displayName: "Gaston" },
				amount: 15000,
				currency: "ARS",
				paidAt,
				notes: "Paid by transfer",
				createdAt: paidAt,
			},
			balances: [
				{ memberId: "from-member", displayName: "Ana", balance: 0, currency: "ARS" },
				{ memberId: "to-member", displayName: "Gaston", balance: 0, currency: "ARS" },
			],
		});
		expect(repository.recordSettlementPayment).toHaveBeenCalledWith({
			groupId: "group-1",
			fromMemberId: "from-member",
			toMemberId: "to-member",
			amount: 15000,
			currency: "ARS",
			paidAt,
			notes: "Paid by transfer",
		});
		expect(repository.findActiveGroupMembersForUser).toHaveBeenCalledWith({
			groupId: "group-1",
			userId: "user-1",
		});
		expect(repository.findGroupLedgerForUser).toHaveBeenCalledWith({
			groupId: "group-1",
			userId: "user-1",
		});
	});

	it("throws BusinessException when the group is missing or not accessible", async () => {
		repository.findActiveGroupMembersForUser.mockResolvedValue(null);

		await expect(
			useCase.execute("user-1", {
				groupId: "missing-group",
				fromMemberId: "from-member",
				toMemberId: "to-member",
				amount: 15000,
				currency: "ARS",
				paidAt,
				notes: null,
			}),
		).rejects.toMatchObject({
			code: "GROUP_NOT_FOUND",
			message: "Group not found.",
			statusCode: 404,
			type: "business",
		});
	});

	it("throws BusinessException when either member is not active in the group", async () => {
		repository.findActiveGroupMembersForUser.mockResolvedValue([
			{ memberId: "from-member", displayName: "Ana" },
		]);

		await expect(
			useCase.execute("user-1", {
				groupId: "group-1",
				fromMemberId: "from-member",
				toMemberId: "missing-member",
				amount: 15000,
				currency: "ARS",
				paidAt,
				notes: null,
			}),
		).rejects.toMatchObject({
			code: "SETTLEMENT_MEMBER_NOT_IN_GROUP",
			message: "Both settlement members must be active members of the group.",
			statusCode: 400,
			type: "business",
		});
		await expect(
			useCase.execute("user-1", {
				groupId: "group-1",
				fromMemberId: "from-member",
				toMemberId: "missing-member",
				amount: 15000,
				currency: "ARS",
				paidAt,
				notes: null,
			}),
		).rejects.toBeInstanceOf(BusinessException);
	});

	it("throws BusinessException when the amount is not greater than zero", async () => {
		repository.findActiveGroupMembersForUser.mockResolvedValue([
			{ memberId: "from-member", displayName: "Ana" },
			{ memberId: "to-member", displayName: "Gaston" },
		]);

		await expect(
			useCase.execute("user-1", {
				groupId: "group-1",
				fromMemberId: "from-member",
				toMemberId: "to-member",
				amount: 0,
				currency: "ARS",
				paidAt,
				notes: null,
			}),
		).rejects.toMatchObject({
			code: "SETTLEMENT_AMOUNT_MUST_BE_POSITIVE",
			message: "Settlement amount must be greater than zero.",
			statusCode: 400,
			type: "business",
		});
	});
});
