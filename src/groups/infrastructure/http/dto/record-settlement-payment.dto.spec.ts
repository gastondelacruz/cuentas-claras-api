import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { RecordSettlementPaymentRequestDto } from "./record-settlement-payment-request.dto";

describe("RecordSettlementPaymentRequestDto", () => {
	const validPayload = {
		fromMemberId: "11111111-1111-4111-8111-111111111111",
		toMemberId: "22222222-2222-4222-8222-222222222222",
		amount: 15000,
		currency: "ARS",
		paidAt: "2026-06-15T12:00:00.000Z",
		notes: "Paid by transfer",
	};

	it("accepts a valid settlement payment request", async () => {
		const dto = plainToInstance(RecordSettlementPaymentRequestDto, validPayload);

		await expect(validate(dto)).resolves.toHaveLength(0);
	});

	it("rejects a non-positive amount", async () => {
		const dto = plainToInstance(RecordSettlementPaymentRequestDto, {
			...validPayload,
			amount: 0,
		});

		const errors = await validate(dto);

		expect(errors).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ property: "amount" }),
			]),
		);
	});

	it("rejects invalid member identifiers and currency", async () => {
		const dto = plainToInstance(RecordSettlementPaymentRequestDto, {
			...validPayload,
			fromMemberId: "not-a-uuid",
			toMemberId: "also-not-a-uuid",
			currency: "ars",
		});

		const errors = await validate(dto);

		expect(errors.map((error) => error.property)).toEqual(
			expect.arrayContaining(["fromMemberId", "toMemberId", "currency"]),
		);
	});

	it("rejects an invalid paidAt date", async () => {
		const dto = plainToInstance(RecordSettlementPaymentRequestDto, {
			...validPayload,
			paidAt: "not-a-date",
		});

		const errors = await validate(dto);

		expect(errors.map((error) => error.property)).toContain("paidAt");
	});
});
