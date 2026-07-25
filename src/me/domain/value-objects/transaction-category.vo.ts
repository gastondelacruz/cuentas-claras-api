import type { TransactionType } from "./transaction-type.vo";
import { DEFAULT_PERSONAL_CATEGORIES } from "./personal-category.vo";

export const EXPENSE_CATEGORIES = DEFAULT_PERSONAL_CATEGORIES.filter(
	(category) => category.type === "expense",
).map((category) => category.name) as readonly string[];
export const INCOME_CATEGORIES = DEFAULT_PERSONAL_CATEGORIES.filter(
	(category) => category.type === "income",
).map((category) => category.name) as readonly string[];

export const TRANSACTION_CATEGORY_SWAGGER_VALUES = Array.from(
	new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]),
);

export type ExpenseCategory = string;
export type IncomeCategory = string;

export function categoriesForType(type: TransactionType): readonly string[] {
	return type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

export function isValidCategoryForType(
	type: TransactionType,
	category: string,
): boolean {
	return categoriesForType(type).includes(category);
}
