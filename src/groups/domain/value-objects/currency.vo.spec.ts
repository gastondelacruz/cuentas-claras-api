import { Currency } from "./currency.vo";

describe("Currency", () => {
	it("accepts a 3-letter uppercase currency code", () => {
		const currency = new Currency("ARS");

		expect(currency.getValue()).toBe("ARS");
		expect(currency.value).toBe("ARS");
	});

	it("rejects lowercase, too long, and too short currency codes", () => {
		expect(() => new Currency("ars")).toThrow("Currency must be a 3-letter uppercase code.");
		expect(() => new Currency("ARSS")).toThrow("Currency must be a 3-letter uppercase code.");
		expect(() => new Currency("AR")).toThrow("Currency must be a 3-letter uppercase code.");
	});
});
