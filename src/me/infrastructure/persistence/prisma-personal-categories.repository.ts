import { Injectable } from "@nestjs/common";
// biome-ignore lint/style/useImportType: Nest injects this service at runtime.
import { PrismaService } from "../../../prisma/prisma.service";
import { DatabaseException } from "../../../shared/exceptions/database.exception";
import {
	PersonalCategoriesRepository,
	type CreatePersonalCategoryInput,
	type PersonalCategory,
	type UpdatePersonalCategoryInput,
} from "../../domain/ports/personal-categories.repository";
import {
	isValidStoredCategoryIcon,
	type StoredPersonalCategoryIcon,
} from "../../domain/value-objects/personal-category.vo";
import {
	TRANSACTION_TYPES,
	type TransactionType,
} from "../../domain/value-objects/transaction-type.vo";

type PersonalCategoryRecord = {
	id: string;
	userId: string;
	name: string;
	normalizedName: string;
	type: string;
	icon: string;
	color: string;
	isDefault: boolean;
	createdAt: Date;
	updatedAt: Date;
};

@Injectable()
export class PrismaPersonalCategoriesRepository extends PersonalCategoriesRepository {
	constructor(private readonly prisma: PrismaService) {
		super();
	}

	async findByUserId(userId: string): Promise<PersonalCategory[]> {
		return this.run(async () => {
			const records = await this.prisma.personalCategory.findMany({
				where: { userId },
				orderBy: { createdAt: "asc" },
			});
			return records.map((record) => this.toDomain(record));
		});
	}

	async findByIdAndUserId(
		id: string,
		userId: string,
	): Promise<PersonalCategory | null> {
		return this.run(async () => {
			const record = await this.prisma.personalCategory.findFirst({
				where: { id, userId },
			});
			return record ? this.toDomain(record) : null;
		});
	}

	async findByUserTypeAndNormalizedName(
		userId: string,
		type: TransactionType,
		normalizedName: string,
	): Promise<PersonalCategory | null> {
		return this.run(async () => {
			const record = await this.prisma.personalCategory.findUnique({
				where: { userId_type_normalizedName: { userId, type, normalizedName } },
			});
			return record ? this.toDomain(record) : null;
		});
	}

	async create(input: CreatePersonalCategoryInput): Promise<PersonalCategory> {
		return this.run(async () => {
			const record = await this.prisma.personalCategory.create({
				data: { ...input, isDefault: input.isDefault ?? false },
			});
			return this.toDomain(record);
		});
	}

	async update(
		id: string,
		userId: string,
		data: UpdatePersonalCategoryInput,
	): Promise<PersonalCategory | null> {
		return this.run(async () => {
			const result = await this.prisma.personalCategory.updateMany({
				where: { id, userId, isDefault: false },
				data,
			});
			if (!result.count) return null;
			const record = await this.prisma.personalCategory.findUniqueOrThrow({
				where: { id },
			});
			return this.toDomain(record);
		});
	}

	private toDomain(record: PersonalCategoryRecord): PersonalCategory {
		if (
			!TRANSACTION_TYPES.includes(record.type as TransactionType) ||
			!isValidStoredCategoryIcon(record.icon)
		) {
			throw new Error("Invalid personal category data.");
		}
		return {
			...record,
			type: record.type as TransactionType,
			icon: record.icon as StoredPersonalCategoryIcon,
		};
	}

	private async run<T>(operation: () => Promise<T>): Promise<T> {
		try {
			return await operation();
		} catch (error) {
			if (error instanceof DatabaseException) throw error;
			throw new DatabaseException("PERSONAL_CATEGORY_DATABASE_ERROR");
		}
	}
}
