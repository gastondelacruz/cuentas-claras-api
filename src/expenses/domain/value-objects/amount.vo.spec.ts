import { Amount } from "./amount.vo";

describe("Amount", () => {
	it("exposes the value as a number with two decimals of precision", () => {
		expect(new Amount(30000).getValue()).toBe(30000);
		expect(new Amount(125.5).getValue()).toBe(125.5);
		expect(new Amount(33.333).getValue()).toBe(33.33);
	});

	it("exposes the value in integer cents", () => {
		expect(new Amount(100).getCents()).toBe(10000);
		expect(new Amount(0.01).getCents()).toBe(1);
	});

	it("throws when the amount is zero or negative", () => {
		expect(() => new Amount(0)).toThrow("Amount must be greater than 0.");
		expect(() => new Amount(-10)).toThrow("Amount must be greater than 0.");
	});

	it("throws when the amount is not a finite number", () => {
		expect(() => new Amount(Number.NaN)).toThrow("Amount must be a finite number.");
		expect(() => new Amount(Number.POSITIVE_INFINITY)).toThrow(
			"Amount must be a finite number.",
		);
	});
});
