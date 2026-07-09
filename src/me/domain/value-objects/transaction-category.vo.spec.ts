import {
	EXPENSE_CATEGORIES,
	INCOME_CATEGORIES,
	isValidCategoryForType,
} from "./transaction-category.vo";

describe("transaction-category", () => {
	it("returns expense categories for expense type", () => {
		expect(isValidCategoryForType("expense", "Salud")).toBe(true);
		expect(isValidCategoryForType("expense", "Salario")).toBe(false);
	});

	it("returns income categories for income type", () => {
		expect(isValidCategoryForType("income", "Salario")).toBe(true);
		expect(isValidCategoryForType("income", "Salud")).toBe(false);
	});

	it("exposes the expected allow-lists", () => {
		expect(EXPENSE_CATEGORIES).toEqual([
			"Salud",
			"Ocio",
			"Departament",
			"Café",
			"Educación",
			"Regalos",
			"Transporte",
			"Otros",
			"Servicio",
			"Tarjetas",
			"Auto",
			"Ropa",
			"Alimentación",
		]);
		expect(INCOME_CATEGORIES).toEqual([
			"Salario",
			"Regalos",
			"Intereses",
			"Otros",
		]);
	});
});
