import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { ListPersonalTransactionsQueryDto } from "./list-personal-transactions-query.dto";

describe("ListPersonalTransactionsQueryDto", () => {
	it("defaults range to week and limit to 20 when omitted", () => {
		const dto = plainToInstance(ListPersonalTransactionsQueryDto, {});

		expect(dto.range).toBe("week");
		expect(dto.limit).toBe(20);
	});

	it("accepts range=period together with from/to/type/cursor", async () => {
		const dto = plainToInstance(ListPersonalTransactionsQueryDto, {
			range: "period",
			from: "2026-06-01T00:00:00.000Z",
			to: "2026-06-30T23:59:59.999Z",
			type: "income",
			cursor: "abc",
		});

		const errors = await validate(dto);

		expect(errors).toHaveLength(0);
		expect(dto.range).toBe("period");
		expect(dto.from).toBe("2026-06-01T00:00:00.000Z");
		expect(dto.to).toBe("2026-06-30T23:59:59.999Z");
	});

	it("rejects an invalid ISO 8601 value for from", async () => {
		const dto = plainToInstance(ListPersonalTransactionsQueryDto, {
			from: "not-a-date",
		});

		const errors = await validate(dto);

		expect(errors.some((error) => error.property === "from")).toBe(true);
	});

	it("rejects an invalid ISO 8601 value for to", async () => {
		const dto = plainToInstance(ListPersonalTransactionsQueryDto, {
			to: "not-a-date",
		});

		const errors = await validate(dto);

		expect(errors.some((error) => error.property === "to")).toBe(true);
	});
});
