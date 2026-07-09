import { PrismaRefreshTokenRepository } from "./prisma-refresh-token.repository";

describe("PrismaRefreshTokenRepository", () => {
	it("does not save a stale password-login session after account claim invalidates the validated password", async () => {
		const transaction = {
			user: {
				updateMany: vi.fn().mockResolvedValue({ count: 0 }),
			},
			refreshToken: {
				create: vi.fn(),
			},
		};
		const prisma = {
			$transaction: vi.fn(async (callback) => callback(transaction)),
		};
		const repository = new PrismaRefreshTokenRepository(prisma as never);
		const input = {
			userId: "11111111-1111-1111-1111-111111111111",
			tokenHash: "stale-token-hash",
			tokenDigest: "stale-token-digest",
			expiresAt: new Date("2026-08-01T00:00:00.000Z"),
		};

		await expect(
			repository.saveIfPasswordUnchanged(input, "validated-password-hash"),
		).resolves.toBe(false);
		expect(transaction.user.updateMany).toHaveBeenCalledWith({
			where: {
				id: input.userId,
				passwordHash: "validated-password-hash",
			},
			data: { passwordHash: "validated-password-hash" },
		});
		expect(transaction.refreshToken.create).not.toHaveBeenCalled();
	});

	it("locks the validated password state before saving so a later claim deletes the new session", async () => {
		const calls: string[] = [];
		const transaction = {
			user: {
				updateMany: vi.fn(async () => {
					calls.push("lock-user");
					return { count: 1 };
				}),
			},
			refreshToken: {
				create: vi.fn(async () => {
					calls.push("create-session");
				}),
			},
		};
		const prisma = {
			$transaction: vi.fn(async (callback) => callback(transaction)),
		};
		const repository = new PrismaRefreshTokenRepository(prisma as never);

		await expect(
			repository.saveIfPasswordUnchanged(
				{
					userId: "22222222-2222-2222-2222-222222222222",
					tokenHash: "new-token-hash",
					tokenDigest: "new-token-digest",
					expiresAt: new Date("2026-08-01T00:00:00.000Z"),
				},
				"validated-password-hash",
			),
		).resolves.toBe(true);
		expect(calls).toEqual(["lock-user", "create-session"]);
	});

	it("does not rotate a stale refresh session after account claim deletes the validated token", async () => {
		const transaction = {
			user: {
				updateMany: vi.fn().mockResolvedValue({ count: 1 }),
			},
			refreshToken: {
				updateMany: vi.fn().mockResolvedValue({ count: 0 }),
				create: vi.fn(),
			},
		};
		const prisma = {
			$transaction: vi.fn(async (callback) => callback(transaction)),
		};
		const repository = new PrismaRefreshTokenRepository(prisma as never);

		await expect(
			repository.rotateIfActive(
				"validated-token-id",
				{
					userId: "33333333-3333-3333-3333-333333333333",
					tokenHash: "new-token-hash",
					tokenDigest: "new-token-digest",
					expiresAt: new Date("2026-08-01T00:00:00.000Z"),
				},
				null,
			),
		).resolves.toBe(false);
		expect(transaction.refreshToken.create).not.toHaveBeenCalled();
	});

	it("locks account state before rotation so a later claim invalidates the replacement session", async () => {
		const calls: string[] = [];
		const transaction = {
			user: {
				updateMany: vi.fn(async () => {
					calls.push("lock-user");
					return { count: 1 };
				}),
			},
			refreshToken: {
				updateMany: vi.fn(async () => {
					calls.push("revoke-validated-session");
					return { count: 1 };
				}),
				create: vi.fn(async () => {
					calls.push("create-replacement-session");
				}),
			},
		};
		const prisma = {
			$transaction: vi.fn(async (callback) => callback(transaction)),
		};
		const repository = new PrismaRefreshTokenRepository(prisma as never);

		await expect(
			repository.rotateIfActive(
				"validated-token-id",
				{
					userId: "44444444-4444-4444-4444-444444444444",
					tokenHash: "replacement-hash",
					tokenDigest: "replacement-digest",
					expiresAt: new Date("2026-08-01T00:00:00.000Z"),
				},
				null,
			),
		).resolves.toBe(true);
		expect(calls).toEqual([
			"lock-user",
			"revoke-validated-session",
			"create-replacement-session",
		]);
	});
});
