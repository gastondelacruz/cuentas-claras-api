import { Test, type TestingModule } from "@nestjs/testing";
import { AuthUserRepository } from "../../domain/ports/auth-user.repository";
import { PasswordHasher } from "../../domain/ports/password-hasher";
import { RefreshTokenRepository } from "../../domain/ports/refresh-token.repository";
import { TokenDigestService } from "../../domain/ports/token-digest.service";
import { TokenService } from "../../domain/ports/token.service";
import { RefreshTokenUseCase } from "./refresh.use-case";

describe("RefreshTokenUseCase", () => {
	let useCase: RefreshTokenUseCase;
	let tokens: {
		signAccessToken: ReturnType<typeof vi.fn>;
		signRefreshToken: ReturnType<typeof vi.fn>;
		verifyRefreshToken: ReturnType<typeof vi.fn>;
	};
	let refreshTokens: {
		save: ReturnType<typeof vi.fn>;
		findByDigest: ReturnType<typeof vi.fn>;
		revoke: ReturnType<typeof vi.fn>;
		revokeAllByUserId: ReturnType<typeof vi.fn>;
	};
	let users: {
		findById: ReturnType<typeof vi.fn>;
		findByEmail: ReturnType<typeof vi.fn>;
		findByEmailForLogin: ReturnType<typeof vi.fn>;
		createWithPassword: ReturnType<typeof vi.fn>;
	};
	let passwordHasher: {
		hash: ReturnType<typeof vi.fn>;
		verify: ReturnType<typeof vi.fn>;
	};
	let tokenDigestService: {
		digest: ReturnType<typeof vi.fn>;
	};

	beforeEach(async () => {
		tokens = {
			signAccessToken: vi.fn(),
			signRefreshToken: vi.fn(),
			verifyRefreshToken: vi.fn(),
		};
		refreshTokens = {
			save: vi.fn(),
			findByDigest: vi.fn(),
			revoke: vi.fn(),
			revokeAllByUserId: vi.fn(),
		};
		users = {
			findById: vi.fn(),
			findByEmail: vi.fn(),
			findByEmailForLogin: vi.fn(),
			createWithPassword: vi.fn(),
		};
		passwordHasher = {
			hash: vi.fn(),
			verify: vi.fn(),
		};
		tokenDigestService = {
			digest: vi.fn((token: string) => `${token}-digest`),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				RefreshTokenUseCase,
				{ provide: TokenService, useValue: tokens },
				{ provide: RefreshTokenRepository, useValue: refreshTokens },
				{ provide: AuthUserRepository, useValue: users },
				{ provide: PasswordHasher, useValue: passwordHasher },
				{ provide: TokenDigestService, useValue: tokenDigestService },
			],
		}).compile();

		useCase = module.get(RefreshTokenUseCase);
	});

	it("rotates the token: revokes old, issues new pair, persists new hash", async () => {
		const userId = "11111111-1111-1111-1111-111111111111";
		const email = "jane@example.com";
		const rawToken = "old-refresh-token";
		const expiresAt = new Date("2026-08-01T00:00:00.000Z");
		const existingToken = {
			id: "aaaaaaaa-0000-0000-0000-000000000001",
			userId,
			tokenHash: "hashed-old-token",
			tokenDigest: "old-token-digest",
			expiresAt,
			revokedAt: null,
		};

		tokens.verifyRefreshToken.mockResolvedValue({ sub: userId });
		users.findById.mockResolvedValue({ id: userId, name: "Jane", email });
		refreshTokens.findByDigest.mockResolvedValue(existingToken);
		passwordHasher.verify.mockResolvedValue(true);
		tokens.signAccessToken.mockResolvedValue("new-access-token");
		tokens.signRefreshToken.mockResolvedValue({
			token: "new-refresh-token",
			expiresAt,
		});
		passwordHasher.hash.mockResolvedValue("hashed-new-token");
		refreshTokens.revoke.mockResolvedValue(undefined);
		refreshTokens.save.mockResolvedValue(undefined);

		const result = await useCase.execute({ refreshToken: rawToken });

		expect(result).toEqual({
			accessToken: "new-access-token",
			refreshToken: "new-refresh-token",
		});
		expect(tokens.verifyRefreshToken).toHaveBeenCalledWith(rawToken);
		expect(users.findById).toHaveBeenCalledWith(userId);
		expect(tokenDigestService.digest).toHaveBeenCalledWith(rawToken);
		expect(refreshTokens.findByDigest).toHaveBeenCalledWith(
			`${rawToken}-digest`,
		);
		expect(passwordHasher.verify).toHaveBeenCalledWith(
			rawToken,
			"hashed-old-token",
		);
		expect(refreshTokens.revoke).toHaveBeenCalledWith(existingToken.id);
		expect(tokens.signAccessToken).toHaveBeenCalledWith({
			sub: userId,
			email,
			emailVerified: false,
		});
		expect(tokens.signRefreshToken).toHaveBeenCalledWith({ sub: userId });
		expect(passwordHasher.hash).toHaveBeenCalledWith("new-refresh-token");
		expect(tokenDigestService.digest).toHaveBeenCalledWith("new-refresh-token");
		expect(refreshTokens.save).toHaveBeenCalledWith({
			userId,
			tokenHash: "hashed-new-token",
			tokenDigest: "new-refresh-token-digest",
			expiresAt,
		});
		expect(refreshTokens.revokeAllByUserId).not.toHaveBeenCalled();
	});

	it("detects reuse: valid JWT but no argon2 match → revokes all and throws 401", async () => {
		const userId = "22222222-2222-2222-2222-222222222222";
		const rawToken = "reused-refresh-token";
		const existingToken = {
			id: "bbbbbbbb-0000-0000-0000-000000000002",
			userId,
			tokenHash: "different-hash",
			tokenDigest: "some-digest",
			expiresAt: new Date("2026-08-01T00:00:00.000Z"),
			revokedAt: null,
		};

		tokens.verifyRefreshToken.mockResolvedValue({ sub: userId });
		users.findById.mockResolvedValue({
			id: userId,
			name: "User",
			email: "user@example.com",
		});
		refreshTokens.findByDigest.mockResolvedValue(existingToken);
		passwordHasher.verify.mockResolvedValue(false);
		refreshTokens.revokeAllByUserId.mockResolvedValue(undefined);

		await expect(
			useCase.execute({ refreshToken: rawToken }),
		).rejects.toMatchObject({
			code: "INVALID_REFRESH_TOKEN",
			statusCode: 401,
			type: "business",
		});

		expect(refreshTokens.revokeAllByUserId).toHaveBeenCalledWith(userId);
		expect(refreshTokens.revoke).not.toHaveBeenCalled();
		expect(tokens.signAccessToken).not.toHaveBeenCalled();
	});

	it("rejects a digest match belonging to another user", async () => {
		const userId = "33333333-3333-3333-3333-333333333333";
		const token = "foreign-refresh-token";

		tokens.verifyRefreshToken.mockResolvedValue({ sub: userId });
		users.findById.mockResolvedValue({
			id: userId,
			name: "User",
			email: "user@example.com",
		});
		refreshTokens.findByDigest.mockResolvedValue({
			id: "cccccccc-0000-0000-0000-000000000003",
			userId: "different-user-id",
			tokenHash: "hash",
			tokenDigest: `${token}-digest`,
			expiresAt: new Date(Date.now() + 60_000),
			revokedAt: null,
		});

		await expect(
			useCase.execute({ refreshToken: token }),
		).rejects.toMatchObject({
			code: "INVALID_REFRESH_TOKEN",
			statusCode: 401,
		});

		expect(passwordHasher.verify).not.toHaveBeenCalled();
		expect(refreshTokens.revokeAllByUserId).not.toHaveBeenCalled();
	});

	it.each([
		["revoked", new Date(Date.now() + 60_000), new Date()],
		["expired", new Date(Date.now() - 60_000), null],
	])("rejects a %s digest match before Argon2 verification", async (_state, expiresAt, revokedAt) => {
		const userId = "eeeeeeee-0000-0000-0000-000000000005";
		const token = "invalid-state-refresh-token";

		tokens.verifyRefreshToken.mockResolvedValue({ sub: userId });
		users.findById.mockResolvedValue({
			id: userId,
			name: "User",
			email: "user@example.com",
		});
		refreshTokens.findByDigest.mockResolvedValue({
			id: "ffffffff-0000-0000-0000-000000000006",
			userId,
			tokenHash: "hash",
			tokenDigest: `${token}-digest`,
			expiresAt,
			revokedAt,
		});

		await expect(
			useCase.execute({ refreshToken: token }),
		).rejects.toMatchObject({
			code: "INVALID_REFRESH_TOKEN",
			statusCode: 401,
		});

		expect(passwordHasher.verify).not.toHaveBeenCalled();
		if (revokedAt !== null) {
			expect(refreshTokens.revokeAllByUserId).toHaveBeenCalledWith(userId);
		} else {
			expect(refreshTokens.revokeAllByUserId).not.toHaveBeenCalled();
		}
	});

	it("throws 401 when no active tokens exist for the user", async () => {
		const userId = "33333333-3333-3333-3333-333333333333";

		tokens.verifyRefreshToken.mockResolvedValue({ sub: userId });
		users.findById.mockResolvedValue({
			id: userId,
			name: "User",
			email: "user@example.com",
		});
		refreshTokens.findByDigest.mockResolvedValue(null);

		await expect(
			useCase.execute({ refreshToken: "some-token" }),
		).rejects.toMatchObject({
			code: "INVALID_REFRESH_TOKEN",
			statusCode: 401,
			type: "business",
		});

		expect(passwordHasher.verify).not.toHaveBeenCalled();
		expect(refreshTokens.revokeAllByUserId).not.toHaveBeenCalled();
		expect(tokens.signAccessToken).not.toHaveBeenCalled();
	});

	it("throws 401 when the refresh JWT user no longer exists", async () => {
		const userId = "44444444-4444-4444-4444-444444444444";

		tokens.verifyRefreshToken.mockResolvedValue({ sub: userId });
		users.findById.mockResolvedValue(null);
		refreshTokens.findByDigest.mockResolvedValue({
			id: "dddddddd-0000-0000-0000-000000000004",
			userId,
			tokenHash: "hash",
			tokenDigest: "orphan-token-digest",
			expiresAt: new Date(Date.now() + 60_000),
			revokedAt: null,
		});

		await expect(
			useCase.execute({ refreshToken: "orphan-token" }),
		).rejects.toMatchObject({
			code: "INVALID_REFRESH_TOKEN",
			statusCode: 401,
			type: "business",
		});

		expect(refreshTokens.findByDigest).toHaveBeenCalledWith(
			"orphan-token-digest",
		);
		expect(passwordHasher.verify).not.toHaveBeenCalled();
		expect(tokens.signAccessToken).not.toHaveBeenCalled();
	});

	it("throws 401 when verifyRefreshToken rejects (expired or tampered JWT)", async () => {
		tokens.verifyRefreshToken.mockRejectedValue(new Error("jwt expired"));

		await expect(
			useCase.execute({ refreshToken: "expired-token" }),
		).rejects.toMatchObject({
			code: "INVALID_REFRESH_TOKEN",
			statusCode: 401,
			type: "business",
		});

		expect(refreshTokens.findByDigest).not.toHaveBeenCalled();
		expect(tokens.signAccessToken).not.toHaveBeenCalled();
	});
});
