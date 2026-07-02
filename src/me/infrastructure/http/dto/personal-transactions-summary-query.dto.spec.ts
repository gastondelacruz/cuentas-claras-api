import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { PersonalTransactionsSummaryQueryDto } from "./personal-transactions-summary-query.dto";

describe("PersonalTransactionsSummaryQueryDto", () => {
	it("defaults range to week when omitted", () => {
		const dto = plainToInstance(PersonalTransactionsSummaryQueryDto, {});

		expect(dto.range).toBe("week");
	});

	it("accepts range=period together with from/to", async () => {
		const dto = plainToInstance(PersonalTransactionsSummaryQueryDto, {
			range: "period",
			from: "2026-06-01T00:00:00.000Z",
			to: "2026-06-30T23:59:59.999Z",
		});

		const errors = await validate(dto);

		expect(errors).toHaveLength(0);
		expect(dto.range).toBe("period");
		expect(dto.from).toBe("2026-06-01T00:00:00.000Z");
		expect(dto.to).toBe("2026-06-30T23:59:59.999Z");
	});

	it("rejects an invalid range", async () => {
		const dto = plainToInstance(PersonalTransactionsSummaryQueryDto, {
			range: "quarter",
		});

		const errors = await validate(dto);

		expect(errors.some((error) => error.property === "range")).toBe(true);
	});

	it("rejects an invalid ISO 8601 value for from", async () => {
		const dto = plainToInstance(PersonalTransactionsSummaryQueryDto, {
			from: "not-a-date",
		});

		const errors = await validate(dto);

		expect(errors.some((error) => error.property === "from")).toBe(true);
	});

	it("rejects an invalid ISO 8601 value for to", async () => {
		const dto = plainToInstance(PersonalTransactionsSummaryQueryDto, {
			to: "not-a-date",
		});

		const errors = await validate(dto);

		expect(errors.some((error) => error.property === "to")).toBe(true);
	});
});
