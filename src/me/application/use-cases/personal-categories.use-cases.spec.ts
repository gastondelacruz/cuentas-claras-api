import { BusinessException } from "../../../shared/exceptions/business.exception";
import {
	CreatePersonalCategoryUseCase,
	ListPersonalCategoriesUseCase,
	UpdatePersonalCategoryUseCase,
} from "./personal-categories.use-cases";

describe("personal category use cases", () => {
	const repository = {
		findByUserId: vi.fn(),
		findByIdAndUserId: vi.fn(),
		findByUserTypeAndNormalizedName: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
	};
	beforeEach(() => vi.resetAllMocks());

	it("combines immutable defaults with user custom categories", async () => {
		repository.findByUserId.mockResolvedValue([
			{
				id: "cat-1",
				userId: "user-1",
				name: "Mascotas",
				normalizedName: "mascotas",
				type: "expense",
				icon: "Heart",
				color: "#EF4444",
				isDefault: false,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		]);
		const result = await new ListPersonalCategoriesUseCase(repository).execute(
			"user-1",
		);
		expect(result).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: "cat-1",
					name: "Mascotas",
					type: "expense",
					icon: "Heart",
					isDefault: false,
				}),
			]),
		);
		expect(result.find((category) => category.name === "Salud")).toMatchObject({
			isDefault: true,
			icon: "Heart",
		});
	});

	it("creates a custom category with normalized uniqueness", async () => {
		repository.findByUserTypeAndNormalizedName.mockResolvedValue(null);
		repository.create.mockResolvedValue({
			id: "cat-1",
			userId: "user-1",
			name: "  Custom pets  ",
			normalizedName: "custom pets",
			type: "expense",
			icon: "Gift",
			color: "#abcdef",
			isDefault: false,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		await expect(
			new CreatePersonalCategoryUseCase(repository).execute({
				userId: "user-1",
				name: "  Custom pets  ",
				type: "expense",
				icon: "Gift",
				color: "#abcdef",
			}),
		).resolves.toMatchObject({
			name: "  Custom pets  ",
			color: "#abcdef",
			isDefault: false,
		});
		expect(repository.create).toHaveBeenCalledWith(
			expect.objectContaining({ normalizedName: "custom pets" }),
		);
	});

	it("rejects duplicate and default categories", async () => {
		repository.findByUserTypeAndNormalizedName.mockResolvedValue({
			id: "existing",
		});
		await expect(
			new CreatePersonalCategoryUseCase(repository).execute({
				userId: "user-1",
				name: "Custom pets",
				type: "expense",
				icon: "Gift",
				color: "#abcdef",
			}),
		).rejects.toMatchObject({ code: "PERSONAL_CATEGORY_ALREADY_EXISTS" });
		await expect(
			new CreatePersonalCategoryUseCase(repository).execute({
				userId: "user-1",
				name: "Salud",
				type: "expense",
				icon: "Heart",
				color: "#abcdef",
			}),
		).rejects.toBeInstanceOf(BusinessException);
	});

	it.each([
		" salud ",
		"SALUD",
		"Cafe\u0301",
	])("rejects creating a custom category that matches a default after normalization: %s", async (name) => {
		repository.findByUserTypeAndNormalizedName.mockResolvedValue(null);
		await expect(
			new CreatePersonalCategoryUseCase(repository).execute({
				userId: "user-1",
				name,
				type: "expense",
				icon: "Gift",
				color: "#abcdef",
			}),
		).rejects.toMatchObject({ code: "PERSONAL_CATEGORY_DEFAULT_IMMUTABLE" });
	});

	it.each([
		" salud ",
		"SALUD",
		"Cafe\u0301",
	])("rejects renaming a custom category to a default after normalization: %s", async (name) => {
		repository.findByIdAndUserId.mockResolvedValue({
			id: "cat-1",
			userId: "user-1",
			name: "Mascotas",
			normalizedName: "mascotas",
			type: "expense",
			icon: "Gift",
			color: "#abcdef",
			isDefault: false,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		repository.findByUserTypeAndNormalizedName.mockResolvedValue(null);
		await expect(
			new UpdatePersonalCategoryUseCase(repository).execute({
				userId: "user-1",
				categoryId: "cat-1",
				name,
			}),
		).rejects.toMatchObject({ code: "PERSONAL_CATEGORY_DEFAULT_IMMUTABLE" });
	});

	it("renames a custom category without touching transactions", async () => {
		repository.findByIdAndUserId.mockResolvedValue({
			id: "cat-1",
			userId: "user-1",
			name: "Mascotas",
			normalizedName: "mascotas",
			type: "expense",
			icon: "Gift",
			color: "#abcdef",
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		repository.findByUserTypeAndNormalizedName.mockResolvedValue(null);
		repository.update.mockResolvedValue({
			id: "cat-1",
			userId: "user-1",
			name: "Animales",
			normalizedName: "animales",
			type: "expense",
			icon: "Gift",
			color: "#abcdef",
			isDefault: false,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		await expect(
			new UpdatePersonalCategoryUseCase(repository).execute({
				userId: "user-1",
				categoryId: "cat-1",
				name: "Animales",
				color: "#123456",
			}),
		).resolves.toMatchObject({ name: "Animales", color: "#abcdef" });
	});
});
