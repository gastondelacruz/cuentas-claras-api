import { type PersonalTransaction } from "../../../domain/ports/personal-transactions.repository";
import { PersonalTransactionsMapper } from "./personal-transactions.mapper";

describe("PersonalTransactionsMapper", () => {
	const transaction: PersonalTransaction = {
		id: "00000000-0000-0000-0000-000000000003",
		userId: "00000000-0000-0000-0000-000000000001",
		accountId: "00000000-0000-0000-0000-000000000002",
		accountName: "Pesos",
		type: "expense",
		amount: 1500,
		currency: "ARS",
		category: "Alimentación",
		occurredAt: new Date("2026-06-29T12:00:00.000Z"),
		note: "Dinner",
		createdAt: new Date("2026-06-29T12:00:00.000Z"),
		updatedAt: new Date("2026-06-29T12:00:00.000Z"),
	};

	it("encodes a cursor to base64url", () => {
		const encoded = PersonalTransactionsMapper.encodeCursor(transaction.id);

		expect(encoded).toBe(Buffer.from(transaction.id).toString("base64url"));
	});

	it("decodes a valid cursor back to the original id", () => {
		const encoded = PersonalTransactionsMapper.encodeCursor(transaction.id);

		expect(PersonalTransactionsMapper.decodeCursor(encoded)).toBe(transaction.id);
	});

	it("returns undefined for a cursor that does not decode to a UUID", () => {
		expect(PersonalTransactionsMapper.decodeCursor("not-a-cursor")).toBeUndefined();
		expect(PersonalTransactionsMapper.decodeCursor("")).toBeUndefined();
		expect(PersonalTransactionsMapper.decodeCursor("dGVzdA")).toBeUndefined();
	});

	it("maps a transaction to a response DTO", () => {
		const dto = PersonalTransactionsMapper.toResponseDto(transaction);

			expect(dto).toEqual({
			id: transaction.id,
			type: transaction.type,
			amount: transaction.amount,
			currency: transaction.currency,
			category: transaction.category,
			accountId: transaction.accountId,
			accountName: transaction.accountName,
			occurredAt: transaction.occurredAt.toISOString(),
			note: transaction.note,
			createdAt: transaction.createdAt.toISOString(),
			updatedAt: transaction.updatedAt.toISOString(),
		});
	});

	it("maps a create response using the same shape as a list item", () => {
		const dto = PersonalTransactionsMapper.toCreateResponseDto(transaction);

		expect(dto).toEqual(PersonalTransactionsMapper.toResponseDto(transaction));
	});

	it("maps a paginated list and encodes the next cursor", () => {
		const output = {
			items: [transaction],
			nextCursor: transaction.id,
			totals: {
				incomeTotal: 0,
				expenseTotal: 1500,
				total: -1500,
				currency: "ARS",
			},
		};

		const dto = PersonalTransactionsMapper.toResponseListDto(output);

		expect(dto.transactions).toHaveLength(1);
		expect(dto.transactions[0]).toEqual(
			PersonalTransactionsMapper.toResponseDto(transaction),
		);
		expect(dto.nextCursor).toBe(
			PersonalTransactionsMapper.encodeCursor(transaction.id),
		);
		expect(dto).toMatchObject(output.totals);
	});

	it("maps a paginated list with no next cursor", () => {
		const output = {
			items: [transaction],
			nextCursor: null,
			totals: {
				incomeTotal: 0,
				expenseTotal: 1500,
				total: -1500,
				currency: "ARS",
			},
		};

		const dto = PersonalTransactionsMapper.toResponseListDto(output);

		expect(dto.nextCursor).toBeNull();
	});
});
