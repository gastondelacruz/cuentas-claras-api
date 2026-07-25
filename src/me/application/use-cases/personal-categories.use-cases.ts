import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../../shared/exceptions/business.exception";
// biome-ignore lint/style/useImportType: Nest uses this abstract class as a runtime DI token.
import {
	PersonalCategoriesRepository,
	type PersonalCategory,
} from "../../domain/ports/personal-categories.repository";
import {
	DEFAULT_PERSONAL_CATEGORIES,
	getPersonalCategory,
	isValidCategoryColor,
	isValidCategoryIcon,
	normalizeCategoryName,
	type PersonalCategoryIcon,
} from "../../domain/value-objects/personal-category.vo";
import type { TransactionType } from "../../domain/value-objects/transaction-type.vo";

export type PersonalCategoryOutput = {
	id: string;
	name: string;
	type: TransactionType;
	icon: string;
	color: string;
	isDefault: boolean;
	userId: string;
	createdAt: Date | null;
	updatedAt: Date | null;
};
export type CreatePersonalCategoryInput = {
	userId: string;
	name: string;
	type: TransactionType;
	icon: string;
	color: string;
};
export type UpdatePersonalCategoryInput = {
	userId: string;
	categoryId: string;
	name?: string;
	icon?: string;
	color?: string;
};

export function toCategoryOutput(
	category: PersonalCategory,
): PersonalCategoryOutput {
	return {
		id: category.id,
		name: category.name,
		type: category.type,
		icon: category.icon,
		color: category.color,
		isDefault: category.isDefault,
		userId: category.userId,
		createdAt: category.createdAt,
		updatedAt: category.updatedAt,
	};
}

export function defaultCategoryOutput(
	category: (typeof DEFAULT_PERSONAL_CATEGORIES)[number],
	userId: string,
): PersonalCategoryOutput {
	return {
		...category,
		id: `default:${category.type}:${normalizeCategoryName(category.name)}`,
		userId,
		isDefault: true,
		createdAt: null,
		updatedAt: null,
	};
}

function invalid(message: string, code = "PERSONAL_CATEGORY_INVALID"): never {
	throw new BusinessException(code, message, 400);
}

@Injectable()
export class ListPersonalCategoriesUseCase {
	constructor(private readonly repository: PersonalCategoriesRepository) {}
	async execute(userId: string): Promise<PersonalCategoryOutput[]> {
		const categories = await this.repository.findByUserId(userId);
		const persistedDefaults = categories.filter(
			(category) => category.isDefault,
		);
		const persistedDefaultKeys = new Set(
			persistedDefaults.map(
				(category) => `${category.type}:${category.normalizedName}`,
			),
		);
		const fallbackDefaults = DEFAULT_PERSONAL_CATEGORIES.filter(
			(category) =>
				!persistedDefaultKeys.has(
					`${category.type}:${normalizeCategoryName(category.name)}`,
				),
		).map((category) => defaultCategoryOutput(category, userId));
		return [
			...persistedDefaults.map(toCategoryOutput),
			...fallbackDefaults,
			...categories
				.filter((category) => !category.isDefault)
				.map(toCategoryOutput),
		];
	}
}

@Injectable()
export class CreatePersonalCategoryUseCase {
	constructor(private readonly repository: PersonalCategoriesRepository) {}
	async execute(
		input: CreatePersonalCategoryInput,
	): Promise<PersonalCategoryOutput> {
		if (!input.name.trim()) invalid("Category name is invalid.");
		if (!isValidCategoryIcon(input.icon)) {
			invalid(
				"Category icon is not allowed.",
				"PERSONAL_CATEGORY_INVALID_ICON",
			);
		}
		if (!isValidCategoryColor(input.color)) {
			invalid("Category color is invalid.");
		}
		if (getPersonalCategory(input.type, input.name)) {
			invalid(
				"Default categories cannot be created or modified.",
				"PERSONAL_CATEGORY_DEFAULT_IMMUTABLE",
			);
		}
		const normalizedName = normalizeCategoryName(input.name);
		if (
			await this.repository.findByUserTypeAndNormalizedName(
				input.userId,
				input.type,
				normalizedName,
			)
		) {
			throw new BusinessException(
				"PERSONAL_CATEGORY_ALREADY_EXISTS",
				"Category already exists.",
				409,
			);
		}
		return toCategoryOutput(
			await this.repository.create({
				...input,
				icon: input.icon as PersonalCategoryIcon,
				normalizedName,
			}),
		);
	}
}

@Injectable()
export class UpdatePersonalCategoryUseCase {
	constructor(private readonly repository: PersonalCategoriesRepository) {}
	async execute(
		input: UpdatePersonalCategoryInput,
	): Promise<PersonalCategoryOutput> {
		const existing = await this.repository.findByIdAndUserId(
			input.categoryId,
			input.userId,
		);
		if (!existing) {
			throw new BusinessException(
				"PERSONAL_CATEGORY_NOT_FOUND",
				"Category not found.",
				404,
			);
		}
		if (existing.isDefault) {
			invalid(
				"Default categories cannot be created or modified.",
				"PERSONAL_CATEGORY_DEFAULT_IMMUTABLE",
			);
		}
		if (input.icon !== undefined && !isValidCategoryIcon(input.icon)) {
			invalid(
				"Category icon is not allowed.",
				"PERSONAL_CATEGORY_INVALID_ICON",
			);
		}
		if (input.color !== undefined && !isValidCategoryColor(input.color)) {
			invalid("Category color is invalid.");
		}
		const normalizedName =
			input.name === undefined
				? existing.normalizedName
				: normalizeCategoryName(input.name);
		if (input.name !== undefined && !input.name.trim()) {
			invalid("Category name is invalid.");
		}
		if (
			input.name !== undefined &&
			getPersonalCategory(existing.type, input.name)
		) {
			invalid(
				"Default categories cannot be created or modified.",
				"PERSONAL_CATEGORY_DEFAULT_IMMUTABLE",
			);
		}
		if (
			input.name !== undefined &&
			normalizedName !== existing.normalizedName &&
			(await this.repository.findByUserTypeAndNormalizedName(
				input.userId,
				existing.type,
				normalizedName,
			))
		) {
			throw new BusinessException(
				"PERSONAL_CATEGORY_ALREADY_EXISTS",
				"Category already exists.",
				409,
			);
		}
		const updated = await this.repository.update(
			input.categoryId,
			input.userId,
			{
				...(input.name !== undefined
					? { name: input.name.trim(), normalizedName }
					: {}),
				...(input.icon !== undefined
					? { icon: input.icon as PersonalCategoryIcon }
					: {}),
				...(input.color !== undefined ? { color: input.color } : {}),
			},
		);
		if (!updated) {
			throw new BusinessException(
				"PERSONAL_CATEGORY_NOT_FOUND",
				"Category not found.",
				404,
			);
		}
		return toCategoryOutput(updated);
	}
}

export async function isCategoryAllowed(
	repository: PersonalCategoriesRepository,
	userId: string,
	type: TransactionType,
	name: string,
): Promise<boolean> {
	return Boolean(
		getPersonalCategory(type, name) ||
			(await repository.findByUserTypeAndNormalizedName(
				userId,
				type,
				normalizeCategoryName(name),
			)),
	);
}
