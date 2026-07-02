import {
	TransactionTypeValueObject,
	TRANSACTION_TYPES,
} from "./transaction-type.vo";

describe("TransactionTypeValueObject", () => {
	it("accepts a valid transaction type", () => {
		for (const type of TRANSACTION_TYPES) {
			const vo = new TransactionTypeValueObject(type);
			expect(vo.value).toBe(type);
		}
	});

	it("throws for an invalid transaction type", () => {
		expect(() => new TransactionTypeValueObject("transfer")).toThrow(
			"Invalid transaction type: transfer",
		);
	});
});
