import { DatabaseException } from "../../../shared/exceptions/database.exception";
import { PrismaAuthUserRepository } from "./prisma-auth-user.repository";

describe("PrismaAuthUserRepository", () => {
	it("finds a user by Google id without exposing persistence-only fields", async () => {
		const foundUser = {
			id: "11111111-1111-1111-1111-111111111111",
			name: "Jane",
			email: "jane@example.com",
			emailVerifiedAt: new Date("2026-07-01T10:00:00.000Z"),
		};
		const prisma = {
			user: {
				findUnique: vi.fn().mockResolvedValue(foundUser),
			},
		};
		const repository = new PrismaAuthUserRepository(prisma as never);

		await expect(repository.findByGoogleId("google-123")).resolves.toEqual(
			foundUser,
		);
		expect(prisma.user.findUnique).toHaveBeenCalledWith({
			where: { googleId: "google-123" },
			select: {
				id: true,
				name: true,
				email: true,
				emailVerifiedAt: true,
			},
		});
	});

	it("creates a Google user and its default account in one transaction", async () => {
		const emailVerifiedAt = new Date("2026-07-01T10:00:00.000Z");
		const createdUser = {
			id: "44444444-4444-4444-4444-444444444444",
			name: "Google User",
			email: "google@example.com",
			emailVerifiedAt,
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
			repository.createGoogleUserWithDefaultAccount(
				{
					name: "Google User",
					email: "google@example.com",
					googleId: "google-123",
					avatarUrl: "https://example.com/avatar.jpg",
					emailVerifiedAt,
				},
				{
					name: "Cuenta principal",
					currency: "ARS",
					kind: "cash",
				},
			),
		).resolves.toEqual(createdUser);

		expect(transaction.user.create).toHaveBeenCalledWith({
			data: {
				name: "Google User",
				email: "google@example.com",
				googleId: "google-123",
				avatarUrl: "https://example.com/avatar.jpg",
				emailVerifiedAt,
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

	it("links a Google account to an existing user only when unlinked or already linked to the same Google id", async () => {
		const emailVerifiedAt = new Date("2026-07-01T10:00:00.000Z");
		const linkedUser = {
			id: "55555555-5555-5555-5555-555555555555",
			name: "Existing",
			email: "existing@example.com",
			emailVerifiedAt,
		};
		const prisma = {
			user: {
				updateMany: vi.fn().mockResolvedValue({ count: 1 }),
				findUnique: vi.fn().mockResolvedValue(linkedUser),
			},
		};
		const repository = new PrismaAuthUserRepository(prisma as never);

		await expect(
			repository.linkGoogleAccount(linkedUser.id, {
				googleId: "google-456",
				avatarUrl: null,
				emailVerifiedAt,
			}),
		).resolves.toEqual(linkedUser);

		expect(prisma.user.updateMany).toHaveBeenCalledWith({
			where: {
				id: linkedUser.id,
				OR: [{ googleId: null }, { googleId: "google-456" }],
			},
			data: {
				googleId: "google-456",
				avatarUrl: null,
				emailVerifiedAt,
			},
		});
		expect(prisma.user.findUnique).toHaveBeenCalledWith({
			where: { id: linkedUser.id },
			select: {
				id: true,
				name: true,
				email: true,
				emailVerifiedAt: true,
				googleId: true,
			},
		});
	});

	it("claims an unverified account and invalidates password and refresh sessions in one transaction", async () => {
		const emailVerifiedAt = new Date("2026-07-10T10:00:00.000Z");
		const claimedUser = {
			id: "88888888-8888-8888-8888-888888888888",
			name: "Pre-registered",
			email: "claimed@example.com",
			emailVerifiedAt,
			googleId: "google-claimed",
		};
		const transaction = {
			user: {
				updateMany: vi.fn().mockResolvedValue({ count: 1 }),
				findUnique: vi.fn().mockResolvedValue(claimedUser),
			},
			refreshToken: {
				deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
				create: vi.fn().mockResolvedValue({}),
			},
		};
		const prisma = {
			$transaction: vi.fn(async (callback) => callback(transaction)),
		};
		const repository = new PrismaAuthUserRepository(prisma as never);

		await expect(
			repository.claimUnverifiedGoogleAccount(
				claimedUser.id,
				{
					googleId: "google-claimed",
					avatarUrl: null,
					emailVerifiedAt,
				},
				{
					userId: claimedUser.id,
					tokenHash: "replacement-hash",
					tokenDigest: "replacement-digest",
					expiresAt: new Date("2026-08-01T00:00:00.000Z"),
				},
			),
		).resolves.toEqual({
			id: claimedUser.id,
			name: claimedUser.name,
			email: claimedUser.email,
			emailVerifiedAt,
		});
		expect(prisma.$transaction).toHaveBeenCalledTimes(1);
		expect(transaction.user.updateMany).toHaveBeenCalledWith({
			where: {
				id: claimedUser.id,
				emailVerifiedAt: null,
				OR: [{ googleId: null }, { googleId: "google-claimed" }],
			},
			data: {
				googleId: "google-claimed",
				avatarUrl: null,
				emailVerifiedAt,
				passwordHash: null,
			},
		});
		expect(transaction.refreshToken.deleteMany).toHaveBeenCalledWith({
			where: { userId: claimedUser.id },
		});
		expect(transaction.refreshToken.create).toHaveBeenCalledWith({
			data: {
				userId: claimedUser.id,
				tokenHash: "replacement-hash",
				tokenDigest: "replacement-digest",
				expiresAt: new Date("2026-08-01T00:00:00.000Z"),
			},
		});
	});

	it("rolls back the account claim when replacement session persistence fails", async () => {
		const userId = "99999999-9999-9999-9999-999999999999";
		const transaction = {
			user: {
				updateMany: vi.fn().mockResolvedValue({ count: 1 }),
			},
			refreshToken: {
				deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
				create: vi.fn().mockRejectedValue(new Error("save failed")),
			},
		};
		const prisma = {
			$transaction: vi.fn(async (callback) => callback(transaction)),
		};
		const repository = new PrismaAuthUserRepository(prisma as never);

		await expect(
			repository.claimUnverifiedGoogleAccount(
				userId,
				{
					googleId: "google-atomic",
					avatarUrl: null,
					emailVerifiedAt: new Date("2026-07-10T10:00:00.000Z"),
				},
				{
					userId,
					tokenHash: "replacement-hash",
					tokenDigest: "replacement-digest",
					expiresAt: new Date("2026-08-01T00:00:00.000Z"),
				},
			),
		).rejects.toBeInstanceOf(DatabaseException);
		expect(transaction.refreshToken.deleteMany).toHaveBeenCalledWith({
			where: { userId },
		});
		expect(transaction.refreshToken.create).toHaveBeenCalledWith({
			data: {
				userId,
				tokenHash: "replacement-hash",
				tokenDigest: "replacement-digest",
				expiresAt: new Date("2026-08-01T00:00:00.000Z"),
			},
		});
	});

	it("does not invalidate sessions when an unverified account claim loses its safety condition", async () => {
		const transaction = {
			user: {
				updateMany: vi.fn().mockResolvedValue({ count: 0 }),
			},
			refreshToken: {
				deleteMany: vi.fn(),
				create: vi.fn(),
			},
		};
		const prisma = {
			$transaction: vi.fn(async (callback) => callback(transaction)),
		};
		const repository = new PrismaAuthUserRepository(prisma as never);

		await expect(
			repository.claimUnverifiedGoogleAccount(
				"88888888-8888-8888-8888-888888888888",
				{
					googleId: "google-new",
					avatarUrl: null,
					emailVerifiedAt: new Date("2026-07-10T10:00:00.000Z"),
				},
				{
					userId: "88888888-8888-8888-8888-888888888888",
					tokenHash: "replacement-hash",
					tokenDigest: "replacement-digest",
					expiresAt: new Date("2026-08-01T00:00:00.000Z"),
				},
			),
		).rejects.toMatchObject({
			code: "GOOGLE_ACCOUNT_LINK_CONFLICT",
			statusCode: 409,
		});
		expect(transaction.refreshToken.deleteMany).not.toHaveBeenCalled();
	});

	it("rejects Google account linking when the target user already has a different Google id", async () => {
		const emailVerifiedAt = new Date("2026-07-01T10:00:00.000Z");
		const prisma = {
			user: {
				updateMany: vi.fn().mockResolvedValue({ count: 0 }),
				findUnique: vi.fn().mockResolvedValue({
					id: "55555555-5555-5555-5555-555555555555",
					name: "Existing",
					email: "existing@example.com",
					emailVerifiedAt,
					googleId: "google-existing",
				}),
			},
		};
		const repository = new PrismaAuthUserRepository(prisma as never);

		await expect(
			repository.linkGoogleAccount("55555555-5555-5555-5555-555555555555", {
				googleId: "google-new",
				avatarUrl: null,
				emailVerifiedAt,
			}),
		).rejects.toMatchObject({
			code: "GOOGLE_ACCOUNT_LINK_CONFLICT",
			message: "Google login could not be completed safely.",
			statusCode: 409,
			type: "business",
		});
		expect(prisma.user.updateMany).toHaveBeenCalledWith({
			where: {
				id: "55555555-5555-5555-5555-555555555555",
				OR: [{ googleId: null }, { googleId: "google-new" }],
			},
			data: {
				googleId: "google-new",
				avatarUrl: null,
				emailVerifiedAt,
			},
		});
	});

	it("recovers Google user creation unique conflicts by re-reading the Google id", async () => {
		const emailVerifiedAt = new Date("2026-07-01T10:00:00.000Z");
		const recoveredUser = {
			id: "66666666-6666-6666-6666-666666666666",
			name: "Google User",
			email: "google@example.com",
			emailVerifiedAt,
		};
		const prisma = {
			$transaction: vi.fn().mockRejectedValue({ code: "P2002" }),
			user: {
				findUnique: vi.fn().mockResolvedValue(recoveredUser),
			},
		};
		const repository = new PrismaAuthUserRepository(prisma as never);

		await expect(
			repository.createGoogleUserWithDefaultAccount(
				{
					name: "Google User",
					email: "google@example.com",
					googleId: "google-123",
					avatarUrl: null,
					emailVerifiedAt,
				},
				{
					name: "Cuenta principal",
					currency: "ARS",
					kind: "cash",
				},
			),
		).resolves.toEqual(recoveredUser);
		expect(prisma.user.findUnique).toHaveBeenCalledWith({
			where: { googleId: "google-123" },
			select: {
				id: true,
				name: true,
				email: true,
				emailVerifiedAt: true,
			},
		});
	});

	it("recovers Google account link unique conflicts by re-reading the Google id", async () => {
		const emailVerifiedAt = new Date("2026-07-01T10:00:00.000Z");
		const recoveredUser = {
			id: "77777777-7777-7777-7777-777777777777",
			name: "Existing",
			email: "existing@example.com",
			emailVerifiedAt,
		};
		const prisma = {
			user: {
				updateMany: vi.fn().mockRejectedValue({ code: "P2002" }),
				findUnique: vi.fn().mockResolvedValue(recoveredUser),
			},
		};
		const repository = new PrismaAuthUserRepository(prisma as never);

		await expect(
			repository.linkGoogleAccount(recoveredUser.id, {
				googleId: "google-456",
				avatarUrl: null,
				emailVerifiedAt,
			}),
		).resolves.toEqual(recoveredUser);
		expect(prisma.user.findUnique).toHaveBeenCalledWith({
			where: { googleId: "google-456" },
			select: {
				id: true,
				name: true,
				email: true,
				emailVerifiedAt: true,
			},
		});
	});

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
