import { DatabaseException } from "../../../shared/exceptions/database.exception";
import { PrismaPersonalCategoriesRepository } from "./prisma-personal-categories.repository";

describe("PrismaPersonalCategoriesRepository", () => {
	it("rejects database rows with an invalid category type", async () => {
		const prisma = {
			personalCategory: {
				findMany: vi.fn().mockResolvedValue([
					{
						id: "category-1",
						userId: "user-1",
						name: "Pets",
						normalizedName: "pets",
						type: "invalid",
						icon: "Gift",
						createdAt: new Date(),
						updatedAt: new Date(),
					},
				]),
			},
		};
		const repository = new PrismaPersonalCategoriesRepository(prisma as never);

		await expect(repository.findByUserId("user-1")).rejects.toBeInstanceOf(
			DatabaseException,
		);
	});
});
