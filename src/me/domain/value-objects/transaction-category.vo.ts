import type { TransactionType } from "./transaction-type.vo";

export const EXPENSE_CATEGORIES = [
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
] as const;

export const INCOME_CATEGORIES = [
	"Salario",
	"Regalos",
	"Intereses",
	"Otros",
] as const;

export const TRANSACTION_CATEGORY_SWAGGER_VALUES = Array.from(
	new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]),
);

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];

export function categoriesForType(type: TransactionType): readonly string[] {
	return type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

export function isValidCategoryForType(
	type: TransactionType,
	category: string,
): boolean {
	return categoriesForType(type).includes(category);
}
