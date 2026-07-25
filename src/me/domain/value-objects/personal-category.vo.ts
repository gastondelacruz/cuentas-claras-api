import type { TransactionType } from "./transaction-type.vo";

export const PERSONAL_CATEGORY_ICONS = [
	"Heart",
	"Tv",
	"Building2",
	"Coffee",
	"BookOpen",
	"Gift",
	"Bus",
	"MoreHorizontal",
	"Wrench",
	"CreditCard",
	"Car",
	"Shirt",
	"ShoppingBasket",
	"Banknote",
	"TrendingUp",
	"BriefcaseBusiness",
	"Dumbbell",
	"House",
	"Landmark",
	"Laptop",
	"Plane",
	"WalletCards",
	"CardSim",
	"Utensils",
	"ShoppingCart",
	"Gamepad2",
	"GraduationCap",
	"PiggyBank",
	"Stethoscope",
	"Baby",
] as const;

export type PersonalCategoryIcon = (typeof PERSONAL_CATEGORY_ICONS)[number];
export const PERSONAL_CATEGORY_RESPONSE_ICONS = [
	...PERSONAL_CATEGORY_ICONS,
	"PawPrint",
] as const;
export type StoredPersonalCategoryIcon =
	(typeof PERSONAL_CATEGORY_RESPONSE_ICONS)[number];

export type DefaultPersonalCategory = {
	name: string;
	type: TransactionType;
	icon: StoredPersonalCategoryIcon;
	color: string;
};

const expense = (
	name: string,
	icon: StoredPersonalCategoryIcon,
	color: string,
): DefaultPersonalCategory => ({ name, type: "expense", icon, color });
const income = (
	name: string,
	icon: StoredPersonalCategoryIcon,
	color: string,
): DefaultPersonalCategory => ({ name, type: "income", icon, color });

export const DEFAULT_PERSONAL_CATEGORIES: readonly DefaultPersonalCategory[] = [
	expense("Salud", "Heart", "#EF4444"),
	expense("Ocio", "Tv", "#22C55E"),
	expense("Departamento", "Building2", "#3B82F6"),
	expense("Café", "Coffee", "#F59E0B"),
	expense("Educación", "BookOpen", "#EC4899"),
	expense("Regalos", "Gift", "#8B5CF6"),
	expense("Alimentación", "ShoppingBasket", "#14B8A6"),
	expense("Transporte", "Bus", "#06B6D4"),
	expense("Otros", "MoreHorizontal", "#64748B"),
	expense("Servicio", "Wrench", "#84CC16"),
	expense("Tarjetas", "CreditCard", "#F97316"),
	expense("Auto", "Car", "#6366F1"),
	expense("Ropa", "Shirt", "#D946EF"),
	expense("Mascotas", "PawPrint", "#A855F7"),
	expense("Viajes", "Plane", "#0EA5E9"),
	expense("Deporte", "Dumbbell", "#F43F5E"),
	expense("Hogar", "House", "#475569"),
	income("Salario", "Banknote", "#22C55E"),
	income("Regalos", "Gift", "#F59E0B"),
	income("Intereses", "TrendingUp", "#3B82F6"),
	income("Freelance", "BriefcaseBusiness", "#8B5CF6"),
	income("Bonos", "Gift", "#EC4899"),
	income("Ventas", "ShoppingCart", "#14B8A6"),
	income("Inversiones", "TrendingUp", "#06B6D4"),
	income("Propiedades", "Landmark", "#F97316"),
];

export function normalizeCategoryName(name: string): string {
	return name.trim().replace(/\s+/gu, " ").normalize("NFC").toLowerCase();
}

export function getPersonalCategory(
	type: TransactionType,
	name: string,
): DefaultPersonalCategory | undefined {
	const normalizedName = normalizeCategoryName(name);
	return DEFAULT_PERSONAL_CATEGORIES.find(
		(category) =>
			category.type === type &&
			normalizeCategoryName(category.name) === normalizedName,
	);
}

export function isValidCategoryIcon(
	icon: string,
): icon is PersonalCategoryIcon {
	return PERSONAL_CATEGORY_ICONS.includes(icon as PersonalCategoryIcon);
}

export function isValidStoredCategoryIcon(
	icon: string,
): icon is StoredPersonalCategoryIcon {
	return isValidCategoryIcon(icon) || icon === "PawPrint";
}

export function isValidCategoryColor(color: string): boolean {
	return /^#[0-9A-Fa-f]{6}$/u.test(color);
}
