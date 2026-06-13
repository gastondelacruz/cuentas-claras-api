import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { UpdateGroupDto } from "./update-group.dto";

describe("UpdateGroupDto", () => {
	it("is valid with the full request body", async () => {
		const dto = plainToInstance(UpdateGroupDto, {
			name: "Updated name",
			description: "Updated description",
			type: "trip",
			currency: "ARS",
			members: [
				{
					displayName: "Ana",
					email: "ana@example.com",
				},
			],
		});

		await expect(validate(dto)).resolves.toHaveLength(0);
	});

	it("is invalid when type is not supported", async () => {
		const dto = plainToInstance(UpdateGroupDto, {
			type: "invalid",
		});

		const errors = await validate(dto);

		expect(errors.some((error) => error.property === "type")).toBe(true);
	});

	it("is invalid when currency is not three uppercase letters", async () => {
		const dto = plainToInstance(UpdateGroupDto, {
			currency: "ars",
		});

		const errors = await validate(dto);

		expect(errors.some((error) => error.property === "currency")).toBe(true);
	});

	it("is invalid when name is null", async () => {
		const dto = plainToInstance(UpdateGroupDto, {
			name: null,
		});

		const errors = await validate(dto);

		expect(errors.some((error) => error.property === "name")).toBe(true);
	});

	it("is invalid when type is null", async () => {
		const dto = plainToInstance(UpdateGroupDto, {
			type: null,
		});

		const errors = await validate(dto);

		expect(errors.some((error) => error.property === "type")).toBe(true);
	});

	it("is invalid when currency is null", async () => {
		const dto = plainToInstance(UpdateGroupDto, {
			currency: null,
		});

		const errors = await validate(dto);

		expect(errors.some((error) => error.property === "currency")).toBe(true);
	});

	it("is invalid when name is empty after trimming", async () => {
		const dto = plainToInstance(UpdateGroupDto, {
			name: "   ",
		});

		const errors = await validate(dto);

		expect(errors.some((error) => error.property === "name")).toBe(true);
	});

	it("is invalid when members is null", async () => {
		const dto = plainToInstance(UpdateGroupDto, {
			members: null,
		});

		const errors = await validate(dto);

		expect(errors.some((error) => error.property === "members")).toBe(true);
	});

	it("is invalid when a member email is null", async () => {
		const dto = plainToInstance(UpdateGroupDto, {
			members: [
				{
					displayName: "Ana",
					email: null,
				},
			],
		});

		const errors = await validate(dto);

		expect(errors.some((error) => error.property === "members")).toBe(true);
	});

	it("is invalid when no fields are provided", async () => {
		const dto = plainToInstance(UpdateGroupDto, {});

		const errors = await validate(dto);

		expect(errors).toHaveLength(1);
		expect(errors[0]?.constraints).toEqual({
			atLeastOneField: "At least one field must be provided.",
		});
	});

	it("is valid when description is explicitly cleared with null", async () => {
		const dto = plainToInstance(UpdateGroupDto, {
			description: null,
		});

		await expect(validate(dto)).resolves.toHaveLength(0);
	});
});
