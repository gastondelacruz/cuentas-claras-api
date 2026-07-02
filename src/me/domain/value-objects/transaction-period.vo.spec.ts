import { TRANSACTION_PERIODS } from "./transaction-period.vo";

describe("TRANSACTION_PERIODS", () => {
	it("contains the supported period values", () => {
		expect(TRANSACTION_PERIODS).toEqual(["day", "week", "month", "year"]);
	});
});
