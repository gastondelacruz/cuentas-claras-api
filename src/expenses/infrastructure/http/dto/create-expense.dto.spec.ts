import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateExpenseRequestDto } from "./create-expense-request.dto";

const VALID_BODY = {
	title: "Dinner",
	amount: 30000,
	currency: "ARS",
	paidByMemberId: "11111111-1111-4111-8111-111111111111",
	participantMemberIds: [
		"11111111-1111-4111-8111-111111111111",
		"22222222-2222-4222-8222-222222222222",
	],
	splitType: "equal",
	category: "food",
	notes: "Pizza night",
	expenseDate: "2026-06-13T20:00:00.000Z",
};

function buildDto(overrides: Record<string, unknown>) {
	return plainToInstance(CreateExpenseRequestDto, {
		...VALID_BODY,
		...overrides,
	});
}

describe("CreateExpenseRequestDto", () => {
	it("is valid with a complete request body", async () => {
		await expect(
			validate(plainToInstance(CreateExpenseRequestDto, VALID_BODY)),
		).resolves.toHaveLength(0);
	});

	it("is invalid when title is missing", async () => {
		const errors = await validate(buildDto({ title: undefined }));
		expect(errors.some((error) => error.property === "title")).toBe(true);
	});

	it("is invalid when amount is zero or negative", async () => {
		const zero = await validate(buildDto({ amount: 0 }));
		const negative = await validate(buildDto({ amount: -10 }));
		expect(zero.some((error) => error.property === "amount")).toBe(true);
		expect(negative.some((error) => error.property === "amount")).toBe(true);
	});

	it("is invalid when currency is not three uppercase letters", async () => {
		const errors = await validate(buildDto({ currency: "ars" }));
		expect(errors.some((error) => error.property === "currency")).toBe(true);
	});

	it("is invalid when paidByMemberId is not a uuid", async () => {
		const errors = await validate(buildDto({ paidByMemberId: "not-a-uuid" }));
		expect(errors.some((error) => error.property === "paidByMemberId")).toBe(true);
	});

	it("is invalid when participantMemberIds is empty", async () => {
		const errors = await validate(buildDto({ participantMemberIds: [] }));
		expect(errors.some((error) => error.property === "participantMemberIds")).toBe(
			true,
		);
	});

	it("is invalid when participantMemberIds contains duplicates", async () => {
		const errors = await validate(
			buildDto({
				participantMemberIds: [
					"11111111-1111-4111-8111-111111111111",
					"11111111-1111-4111-8111-111111111111",
				],
			}),
		);
		expect(errors.some((error) => error.property === "participantMemberIds")).toBe(
			true,
		);
	});

	it("is invalid when splitType is not supported", async () => {
		const errors = await validate(buildDto({ splitType: "custom" }));
		expect(errors.some((error) => error.property === "splitType")).toBe(true);
	});

	it("is invalid when expenseDate is not an iso date", async () => {
		const errors = await validate(buildDto({ expenseDate: "not-a-date" }));
		expect(errors.some((error) => error.property === "expenseDate")).toBe(true);
	});

	it("allows omitting the optional category and notes", async () => {
		const errors = await validate(
			buildDto({ category: undefined, notes: undefined }),
		);
		expect(errors).toHaveLength(0);
	});
});
