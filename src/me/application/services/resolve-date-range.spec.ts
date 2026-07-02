import { BusinessException } from "../../../shared/exceptions/business.exception";
import { resolveDateRange } from "./resolve-date-range";

describe("resolveDateRange", () => {
	const now = new Date("2026-06-29T12:34:56.789Z");

	it("returns null when no period or explicit dates are provided", () => {
		expect(resolveDateRange({}, now)).toBeNull();
	});

	it("returns the current UTC day boundaries when period is day", () => {
		const result = resolveDateRange({ period: "day" }, now);

		expect(result.gte.toISOString()).toBe("2026-06-29T00:00:00.000Z");
		expect(result.lt.toISOString()).toBe("2026-06-30T00:00:00.000Z");
	});

	it("returns the current UTC week boundaries when period is week", () => {
		const result = resolveDateRange({ period: "week" }, now);

		expect(result.gte.toISOString()).toBe("2026-06-29T00:00:00.000Z");
		expect(result.lt.toISOString()).toBe("2026-07-06T00:00:00.000Z");
	});

	it("returns the current UTC month boundaries when period is month", () => {
		const result = resolveDateRange({ period: "month" }, now);

		expect(result.gte.toISOString()).toBe("2026-06-01T00:00:00.000Z");
		expect(result.lt.toISOString()).toBe("2026-07-01T00:00:00.000Z");
	});

	it("returns the current UTC year boundaries when period is year", () => {
		const result = resolveDateRange({ period: "year" }, now);

		expect(result.gte.toISOString()).toBe("2026-01-01T00:00:00.000Z");
		expect(result.lt.toISOString()).toBe("2027-01-01T00:00:00.000Z");
	});

	it("uses explicit dateFrom and dateTo when provided", () => {
		const dateFrom = new Date("2026-05-01T10:00:00.000Z");
		const dateTo = new Date("2026-05-31T22:00:00.000Z");

		const result = resolveDateRange({ period: "day", dateFrom, dateTo }, now);

		expect(result.gte).toEqual(dateFrom);
		expect(result.lt).toEqual(dateTo);
	});

	it("throws PERSONAL_TX_INVALID_PERIOD for an unknown period", () => {
		expect(() =>
			resolveDateRange({ period: "quarter" as "day" }, now),
		).toThrow(BusinessException);

		try {
			resolveDateRange({ period: "quarter" as "day" }, now);
		} catch (error) {
			expect(error).toBeInstanceOf(BusinessException);
			expect((error as BusinessException).code).toBe(
				"PERSONAL_TX_INVALID_PERIOD",
			);
			expect((error as BusinessException).statusCode).toBe(400);
		}
	});
});
