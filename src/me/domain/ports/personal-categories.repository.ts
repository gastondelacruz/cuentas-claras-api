import type { TransactionType } from "../value-objects/transaction-type.vo";
import type {
	PersonalCategoryIcon,
	StoredPersonalCategoryIcon,
} from "../value-objects/personal-category.vo";

export type PersonalCategory = {
	id: string;
	userId: string;
	name: string;
	normalizedName: string;
	type: TransactionType;
	icon: StoredPersonalCategoryIcon;
	color: string;
	isDefault: boolean;
	createdAt: Date;
	updatedAt: Date;
};
export type CreatePersonalCategoryInput = {
	userId: string;
	name: string;
	normalizedName: string;
	type: TransactionType;
	icon: PersonalCategoryIcon;
	color: string;
	isDefault?: boolean;
};
export type UpdatePersonalCategoryInput = {
	name?: string;
	normalizedName?: string;
	icon?: PersonalCategoryIcon;
	color?: string;
};

export abstract class PersonalCategoriesRepository {
	abstract findByUserId(userId: string): Promise<PersonalCategory[]>;
	abstract findByIdAndUserId(
		id: string,
		userId: string,
	): Promise<PersonalCategory | null>;
	abstract findByUserTypeAndNormalizedName(
		userId: string,
		type: TransactionType,
		normalizedName: string,
	): Promise<PersonalCategory | null>;
	abstract create(
		input: CreatePersonalCategoryInput,
	): Promise<PersonalCategory>;
	abstract update(
		id: string,
		userId: string,
		data: UpdatePersonalCategoryInput,
	): Promise<PersonalCategory | null>;
}
