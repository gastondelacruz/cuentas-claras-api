import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateGroupDto } from "./create-group.dto";

describe("CreateGroupDto", () => {
	it("is invalid when name is missing", async () => {
		const dto = plainToInstance(CreateGroupDto, {
			type: "trip",
			currency: "ARS",
		});

		const errors = await validate(dto);

		expect(errors.some((error) => error.property === "name")).toBe(true);
	});

	it("is invalid when type is not supported", async () => {
		const dto = plainToInstance(CreateGroupDto, {
			name: "Trip to Bariloche",
			type: "invalid",
			currency: "ARS",
		});

		const errors = await validate(dto);

		expect(errors.some((error) => error.property === "type")).toBe(true);
	});

	it("is invalid when currency is not three uppercase letters", async () => {
		const dto = plainToInstance(CreateGroupDto, {
			name: "Trip to Bariloche",
			type: "trip",
			currency: "ars",
		});

		const errors = await validate(dto);

		expect(errors.some((error) => error.property === "currency")).toBe(true);
	});

	it("is invalid when a member is missing displayName", async () => {
		const dto = plainToInstance(CreateGroupDto, {
			name: "Trip to Bariloche",
			type: "trip",
			currency: "ARS",
			members: [
				{
					email: "ana@example.com",
				},
			],
		});

		const errors = await validate(dto);

		expect(errors.some((error) => error.property === "members")).toBe(true);
	});

	it("is invalid when members is null", async () => {
		const dto = plainToInstance(CreateGroupDto, {
			name: "Trip to Bariloche",
			type: "trip",
			currency: "ARS",
			members: null,
		});

		const errors = await validate(dto);

		expect(errors.some((error) => error.property === "members")).toBe(true);
	});

	it("is invalid when a member email is null", async () => {
		const dto = plainToInstance(CreateGroupDto, {
			name: "Trip to Bariloche",
			type: "trip",
			currency: "ARS",
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

	it("is valid with a complete request body", async () => {
		const dto = plainToInstance(CreateGroupDto, {
			name: "Trip to Bariloche",
			description: "Shared expenses for the trip",
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

	it("allows omitting members or sending an empty array", async () => {
		const withoutMembers = plainToInstance(CreateGroupDto, {
			name: "Trip to Bariloche",
			type: "trip",
			currency: "ARS",
		});
		const withEmptyMembers = plainToInstance(CreateGroupDto, {
			name: "Trip to Bariloche",
			type: "trip",
			currency: "ARS",
			members: [],
		});

		await expect(validate(withoutMembers)).resolves.toHaveLength(0);
		await expect(validate(withEmptyMembers)).resolves.toHaveLength(0);
	});
});
