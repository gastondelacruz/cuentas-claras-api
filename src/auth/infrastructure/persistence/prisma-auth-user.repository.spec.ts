import { DatabaseException } from "../../../shared/exceptions/database.exception";
import { PrismaAuthUserRepository } from "./prisma-auth-user.repository";

describe("PrismaAuthUserRepository", () => {
	it("creates a user and its default account in one transaction", async () => {
		const createdUser = {
			id: "11111111-1111-1111-1111-111111111111",
			name: "Jane",
			email: "jane@example.com",
		};
		const transaction = {
			user: {
				create: vi.fn().mockResolvedValue(createdUser),
			},
			account: {
				create: vi.fn().mockResolvedValue({}),
			},
		};
		const prisma = {
			$transaction: vi.fn(async (callback) => callback(transaction)),
		};
		const repository = new PrismaAuthUserRepository(prisma as never);

		await expect(
			repository.createUserWithDefaultAccount(
				{
					name: "Jane",
					email: "jane@example.com",
					passwordHash: "hashed-password",
				},
				{
					name: "Cuenta principal",
					currency: "ARS",
					kind: "cash",
				},
			),
		).resolves.toEqual(createdUser);

		expect(prisma.$transaction).toHaveBeenCalledTimes(1);
		expect(transaction.user.create).toHaveBeenCalledWith({
			data: {
				name: "Jane",
				email: "jane@example.com",
				passwordHash: "hashed-password",
			},
			select: {
				id: true,
				name: true,
				email: true,
				emailVerifiedAt: true,
			},
		});
		expect(transaction.account.create).toHaveBeenCalledWith({
			data: {
				userId: createdUser.id,
				name: "Cuenta principal",
				currency: "ARS",
				kind: "CASH",
				isDefault: true,
			},
		});
	});

	it("maps lowercase account kinds to Prisma enum values", async () => {
		const createdUser = {
			id: "22222222-2222-2222-2222-222222222222",
			name: "John",
			email: "john@example.com",
		};
		const transaction = {
			user: {
				create: vi.fn().mockResolvedValue(createdUser),
			},
			account: {
				create: vi.fn().mockResolvedValue({}),
			},
		};
		const prisma = {
			$transaction: vi.fn(async (callback) => callback(transaction)),
		};
		const repository = new PrismaAuthUserRepository(prisma as never);

		await repository.createUserWithDefaultAccount(
			{
				name: "John",
				email: "john@example.com",
				passwordHash: "hashed-password",
			},
			{
				name: "Main bank account",
				currency: "ARS",
				kind: "bank",
			},
		);

		expect(transaction.account.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					kind: "BANK",
				}),
			}),
		);
	});

	it("wraps account creation failures as a database exception", async () => {
		const transaction = {
			user: {
				create: vi.fn().mockResolvedValue({
					id: "33333333-3333-3333-3333-333333333333",
					name: "Jane",
					email: "jane@example.com",
				}),
			},
			account: {
				create: vi.fn().mockRejectedValue(new Error("database failed")),
			},
		};
		const prisma = {
			$transaction: vi.fn(async (callback) => callback(transaction)),
		};
		const repository = new PrismaAuthUserRepository(prisma as never);

		await expect(
			repository.createUserWithDefaultAccount(
				{
					name: "Jane",
					email: "jane@example.com",
					passwordHash: "hashed-password",
				},
				{
					name: "Cuenta principal",
					currency: "ARS",
					kind: "cash",
				},
			),
		).rejects.toBeInstanceOf(DatabaseException);
		expect(transaction.user.create).toHaveBeenCalledTimes(1);
		expect(transaction.account.create).toHaveBeenCalledTimes(1);
	});
});
