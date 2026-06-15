import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { UpdateExpenseRequestDto } from "./update-expense-request.dto";

describe("UpdateExpenseRequestDto", () => {
	it("is valid when all fields are omitted", async () => {
		await expect(
			validate(plainToInstance(UpdateExpenseRequestDto, {})),
		).resolves.toHaveLength(0);
	});

	it("is valid with a complete partial update body", async () => {
		await expect(
			validate(
				plainToInstance(UpdateExpenseRequestDto, {
					title: "Updated dinner",
					amount: 35000,
					currency: "ARS",
					paidByMemberId: "11111111-1111-4111-8111-111111111111",
					participantMemberIds: [
						"11111111-1111-4111-8111-111111111111",
						"22222222-2222-4222-8222-222222222222",
					],
					splitType: "equal",
					category: "food",
					notes: "Updated notes",
					expenseDate: "2026-06-14T20:00:00.000Z",
				}),
			),
		).resolves.toHaveLength(0);
	});

	it("rejects invalid optional fields when they are present", async () => {
		const errors = await validate(
			plainToInstance(UpdateExpenseRequestDto, {
				amount: 0,
				currency: "ars",
				paidByMemberId: "not-a-uuid",
				participantMemberIds: [],
				splitType: "custom",
				expenseDate: "not-a-date",
			}),
		);

		expect(errors.map((error) => error.property)).toEqual(
			expect.arrayContaining([
				"amount",
				"currency",
				"paidByMemberId",
				"participantMemberIds",
				"splitType",
				"expenseDate",
			]),
		);
	});
});
