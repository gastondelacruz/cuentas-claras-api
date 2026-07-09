import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreatePersonalTransactionRequestDto } from "./create-personal-transaction-request.dto";

describe("CreatePersonalTransactionRequestDto", () => {
	const validPayload = {
		type: "expense",
		amount: 1500,
		currency: "ARS",
		category: "Alimentación",
		occurredAt: "2026-06-29T12:00:00.000Z",
	};

	it("passes validation with a note of exactly 200 characters", async () => {
		const dto = plainToInstance(CreatePersonalTransactionRequestDto, {
			...validPayload,
			note: "a".repeat(200),
		});

		const errors = await validate(dto);

		expect(errors).toHaveLength(0);
	});

	it("fails validation when note exceeds 200 characters", async () => {
		const dto = plainToInstance(CreatePersonalTransactionRequestDto, {
			...validPayload,
			note: "a".repeat(201),
		});

		const errors = await validate(dto);

		expect(errors).toHaveLength(1);
		expect(errors[0].property).toBe("note");
		expect(errors[0].constraints).toHaveProperty("maxLength");
	});

	it("passes validation without a note", async () => {
		const dto = plainToInstance(CreatePersonalTransactionRequestDto, {
			...validPayload,
		});

		const errors = await validate(dto);

		expect(errors).toHaveLength(0);
	});

	it("passes validation with a valid expense kind", async () => {
		const dto = plainToInstance(CreatePersonalTransactionRequestDto, {
			...validPayload,
			expenseKind: "fixed",
		});

		const errors = await validate(dto);

		expect(errors).toHaveLength(0);
	});

	it("fails validation with an invalid expense kind", async () => {
		const dto = plainToInstance(CreatePersonalTransactionRequestDto, {
			...validPayload,
			expenseKind: "recurring",
		});

		const errors = await validate(dto);

		expect(errors).toHaveLength(1);
		expect(errors[0].property).toBe("expenseKind");
		expect(errors[0].constraints).toHaveProperty("isIn");
	});
});
