import { Test, type TestingModule } from "@nestjs/testing";
import { BusinessException } from "../../../shared/exceptions/business.exception";
import { AuthUserRepository } from "../../domain/ports/auth-user.repository";
import { GoogleTokenVerifier } from "../../domain/ports/google-token-verifier";
import { PasswordHasher } from "../../domain/ports/password-hasher";
import { RefreshTokenRepository } from "../../domain/ports/refresh-token.repository";
import { TokenDigestService } from "../../domain/ports/token-digest.service";
import { TokenService } from "../../domain/ports/token.service";
import { GoogleLoginUseCase } from "./google-login.use-case";

describe("GoogleLoginUseCase", () => {
	let useCase: GoogleLoginUseCase;
	let users: {
		findByGoogleId: ReturnType<typeof vi.fn>;
		findByEmailForGoogleLink: ReturnType<typeof vi.fn>;
		linkGoogleAccount: ReturnType<typeof vi.fn>;
		claimUnverifiedGoogleAccount: ReturnType<typeof vi.fn>;
		createGoogleUserWithDefaultAccount: ReturnType<typeof vi.fn>;
	};
	let googleTokens: {
		verifyIdToken: ReturnType<typeof vi.fn>;
	};
	let passwordHasher: {
		hash: ReturnType<typeof vi.fn>;
	};
	let tokens: {
		signAccessToken: ReturnType<typeof vi.fn>;
		signRefreshToken: ReturnType<typeof vi.fn>;
	};
	let refreshTokens: {
		save: ReturnType<typeof vi.fn>;
	};
	let tokenDigestService: {
		digest: ReturnType<typeof vi.fn>;
	};

	beforeEach(async () => {
		users = {
			findByGoogleId: vi.fn(),
			findByEmailForGoogleLink: vi.fn(),
			linkGoogleAccount: vi.fn(),
			claimUnverifiedGoogleAccount: vi.fn(),
			createGoogleUserWithDefaultAccount: vi.fn(),
		};
		googleTokens = {
			verifyIdToken: vi.fn(),
		};
		passwordHasher = {
			hash: vi.fn(),
		};
		tokens = {
			signAccessToken: vi.fn(),
			signRefreshToken: vi.fn(),
		};
		refreshTokens = {
			save: vi.fn(),
		};
		tokenDigestService = {
			digest: vi.fn().mockReturnValue("computed-token-digest"),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				GoogleLoginUseCase,
				{ provide: AuthUserRepository, useValue: users },
				{ provide: GoogleTokenVerifier, useValue: googleTokens },
				{ provide: PasswordHasher, useValue: passwordHasher },
				{ provide: TokenService, useValue: tokens },
				{ provide: RefreshTokenRepository, useValue: refreshTokens },
				{ provide: TokenDigestService, useValue: tokenDigestService },
			],
		}).compile();

		useCase = module.get(GoogleLoginUseCase);
	});

	it("logs in an existing user matched by Google id and stores the refresh token", async () => {
		const expiresAt = new Date("2026-07-22T10:00:00.000Z");
		const user = {
			id: "11111111-1111-1111-1111-111111111111",
			name: "Jane",
			email: "jane@example.com",
			emailVerifiedAt: new Date("2026-07-01T10:00:00.000Z"),
		};

		googleTokens.verifyIdToken.mockResolvedValue({
			googleId: "google-123",
			email: "jane@example.com",
			name: "Jane",
			avatarUrl: "https://example.com/avatar.jpg",
			emailVerified: true,
		});
		users.findByGoogleId.mockResolvedValue(user);
		tokens.signAccessToken.mockResolvedValue("access-token");
		tokens.signRefreshToken.mockResolvedValue({
			token: "refresh-token",
			expiresAt,
		});
		passwordHasher.hash.mockResolvedValue("hashed-refresh-token");
		refreshTokens.save.mockResolvedValue(undefined);

		await expect(
			useCase.execute({ idToken: "google-id-token" }),
		).resolves.toEqual({
			accessToken: "access-token",
			refreshToken: "refresh-token",
			user,
		});
		expect(googleTokens.verifyIdToken).toHaveBeenCalledWith("google-id-token");
		expect(users.findByGoogleId).toHaveBeenCalledWith("google-123");
		expect(users.findByEmailForGoogleLink).not.toHaveBeenCalled();
		expect(tokens.signAccessToken).toHaveBeenCalledWith({
			sub: user.id,
			email: user.email,
			emailVerified: true,
		});
		expect(tokens.signRefreshToken).toHaveBeenCalledWith({ sub: user.id });
		expect(passwordHasher.hash).toHaveBeenCalledWith("refresh-token");
		expect(tokenDigestService.digest).toHaveBeenCalledWith("refresh-token");
		expect(refreshTokens.save).toHaveBeenCalledWith({
			userId: user.id,
			tokenHash: "hashed-refresh-token",
			tokenDigest: "computed-token-digest",
			expiresAt,
		});
	});

	it("links an existing app-verified email account when Google confirms the email is verified", async () => {
		const existingUser = {
			id: "22222222-2222-2222-2222-222222222222",
			name: "Existing",
			email: "existing@example.com",
			emailVerifiedAt: new Date("2026-07-01T10:00:00.000Z"),
			googleId: null,
		};
		const linkedUser = {
			...existingUser,
		};

		googleTokens.verifyIdToken.mockResolvedValue({
			googleId: "google-456",
			email: "existing@example.com",
			name: "Google Name",
			avatarUrl: null,
			emailVerified: true,
		});
		users.findByGoogleId.mockResolvedValue(null);
		users.findByEmailForGoogleLink.mockResolvedValue(existingUser);
		users.linkGoogleAccount.mockResolvedValue(linkedUser);
		tokens.signAccessToken.mockResolvedValue("access-token");
		tokens.signRefreshToken.mockResolvedValue({
			token: "refresh-token",
			expiresAt: new Date("2026-07-22T10:00:00.000Z"),
		});
		passwordHasher.hash.mockResolvedValue("hashed-refresh-token");

		await useCase.execute({ idToken: "google-id-token" });

		expect(users.linkGoogleAccount).toHaveBeenCalledWith(existingUser.id, {
			googleId: "google-456",
			avatarUrl: null,
			emailVerifiedAt: expect.any(Date),
		});
		expect(users.createGoogleUserWithDefaultAccount).not.toHaveBeenCalled();
		expect(tokens.signAccessToken).toHaveBeenCalledWith({
			sub: linkedUser.id,
			email: linkedUser.email,
			emailVerified: true,
		});
	});

	it("rejects rebinding an app-verified account already linked to a different Google id", async () => {
		const existingUser = {
			id: "22222222-2222-2222-2222-222222222222",
			name: "Existing",
			email: "existing@example.com",
			emailVerifiedAt: new Date("2026-07-01T10:00:00.000Z"),
			googleId: "google-existing",
		};

		googleTokens.verifyIdToken.mockResolvedValue({
			googleId: "google-new",
			email: "existing@example.com",
			name: "Google Name",
			avatarUrl: null,
			emailVerified: true,
		});
		users.findByGoogleId.mockResolvedValue(null);
		users.findByEmailForGoogleLink.mockResolvedValue(existingUser);
		users.linkGoogleAccount.mockResolvedValue({
			...existingUser,
			googleId: "google-new",
		});

		await expect(
			useCase.execute({ idToken: "google-id-token" }),
		).rejects.toMatchObject({
			code: "GOOGLE_ACCOUNT_LINK_CONFLICT",
			message: "Google login could not be completed safely.",
			statusCode: 409,
			type: "business",
		});
		expect(users.linkGoogleAccount).not.toHaveBeenCalled();
		expect(users.createGoogleUserWithDefaultAccount).not.toHaveBeenCalled();
		expect(tokens.signAccessToken).not.toHaveBeenCalled();
		expect(refreshTokens.save).not.toHaveBeenCalled();
	});

	it("preserves the safe conflict for an unverified account linked to a different Google identity", async () => {
		const existingUser = {
			id: "22222222-2222-2222-2222-222222222222",
			name: "Existing",
			email: "existing@example.com",
			emailVerifiedAt: null,
			googleId: "google-existing",
		};

		googleTokens.verifyIdToken.mockResolvedValue({
			googleId: "google-new",
			email: "existing@example.com",
			name: "Google Name",
			avatarUrl: null,
			emailVerified: true,
		});
		users.findByGoogleId.mockResolvedValue(null);
		users.findByEmailForGoogleLink.mockResolvedValue(existingUser);

		await expect(
			useCase.execute({ idToken: "google-id-token" }),
		).rejects.toMatchObject({
			code: "GOOGLE_ACCOUNT_LINK_CONFLICT",
			statusCode: 409,
		});
		expect(users.claimUnverifiedGoogleAccount).not.toHaveBeenCalled();
		expect(users.linkGoogleAccount).not.toHaveBeenCalled();
	});

	it("claims an existing unverified account and persists its replacement session atomically", async () => {
		const existingUser = {
			id: "22222222-2222-2222-2222-222222222222",
			name: "Existing",
			email: "existing@example.com",
			emailVerifiedAt: null,
			googleId: null,
		};
		const claimedUser = {
			...existingUser,
			emailVerifiedAt: new Date("2026-07-10T10:00:00.000Z"),
		};
		const expiresAt = new Date("2026-07-22T10:00:00.000Z");

		googleTokens.verifyIdToken.mockResolvedValue({
			googleId: "google-456",
			email: "existing@example.com",
			name: "Google Name",
			avatarUrl: null,
			emailVerified: true,
		});
		users.findByGoogleId.mockResolvedValue(null);
		users.findByEmailForGoogleLink.mockResolvedValue(existingUser);
		users.claimUnverifiedGoogleAccount.mockResolvedValue(claimedUser);
		tokens.signAccessToken.mockResolvedValue("access-token");
		tokens.signRefreshToken.mockResolvedValue({
			token: "refresh-token",
			expiresAt,
		});
		passwordHasher.hash.mockResolvedValue("hashed-refresh-token");

		await expect(
			useCase.execute({ idToken: "google-id-token" }),
		).resolves.toMatchObject({ user: claimedUser });
		expect(users.claimUnverifiedGoogleAccount).toHaveBeenCalledWith(
			existingUser.id,
			{
				googleId: "google-456",
				avatarUrl: null,
				emailVerifiedAt: expect.any(Date),
			},
			{
				userId: existingUser.id,
				tokenHash: "hashed-refresh-token",
				tokenDigest: "computed-token-digest",
				expiresAt,
			},
		);
		expect(refreshTokens.save).not.toHaveBeenCalled();
		expect(users.linkGoogleAccount).not.toHaveBeenCalled();
		expect(users.createGoogleUserWithDefaultAccount).not.toHaveBeenCalled();
	});

	it("does not commit an account claim when replacement session persistence fails", async () => {
		const existingUser = {
			id: "99999999-9999-9999-9999-999999999999",
			name: "Existing",
			email: "existing@example.com",
			emailVerifiedAt: null,
			googleId: null,
		};

		googleTokens.verifyIdToken.mockResolvedValue({
			googleId: "google-atomic",
			email: existingUser.email,
			name: existingUser.name,
			avatarUrl: null,
			emailVerified: true,
		});
		users.findByGoogleId.mockResolvedValue(null);
		users.findByEmailForGoogleLink.mockResolvedValue(existingUser);
		tokens.signAccessToken.mockResolvedValue("access-token");
		tokens.signRefreshToken.mockResolvedValue({
			token: "refresh-token",
			expiresAt: new Date("2026-07-22T10:00:00.000Z"),
		});
		passwordHasher.hash.mockResolvedValue("hashed-refresh-token");
		users.claimUnverifiedGoogleAccount.mockRejectedValue(
			new Error("replacement session save failed"),
		);

		await expect(
			useCase.execute({ idToken: "google-id-token" }),
		).rejects.toThrow("replacement session save failed");
		expect(passwordHasher.hash).toHaveBeenCalledBefore(
			users.claimUnverifiedGoogleAccount,
		);
		expect(refreshTokens.save).not.toHaveBeenCalled();
	});

	it("creates a Google user with a default account when no user exists", async () => {
		const createdUser = {
			id: "33333333-3333-3333-3333-333333333333",
			name: "New Google User",
			email: "new-google@example.com",
			emailVerifiedAt: new Date("2026-07-02T10:00:00.000Z"),
		};

		googleTokens.verifyIdToken.mockResolvedValue({
			googleId: "google-789",
			email: "new-google@example.com",
			name: "New Google User",
			avatarUrl: "https://example.com/avatar.jpg",
			emailVerified: true,
		});
		users.findByGoogleId.mockResolvedValue(null);
		users.findByEmailForGoogleLink.mockResolvedValue(null);
		users.createGoogleUserWithDefaultAccount.mockResolvedValue(createdUser);
		tokens.signAccessToken.mockResolvedValue("access-token");
		tokens.signRefreshToken.mockResolvedValue({
			token: "refresh-token",
			expiresAt: new Date("2026-07-22T10:00:00.000Z"),
		});
		passwordHasher.hash.mockResolvedValue("hashed-refresh-token");

		await useCase.execute({ idToken: "google-id-token" });

		expect(users.createGoogleUserWithDefaultAccount).toHaveBeenCalledWith(
			{
				name: "New Google User",
				email: "new-google@example.com",
				googleId: "google-789",
				avatarUrl: "https://example.com/avatar.jpg",
				emailVerifiedAt: expect.any(Date),
			},
			{
				name: "Cuenta principal",
				currency: "ARS",
				kind: "cash",
			},
		);
		expect(
			users.createGoogleUserWithDefaultAccount.mock.calls[0][0],
		).not.toHaveProperty("passwordHash");
		expect(tokens.signAccessToken).toHaveBeenCalledWith({
			sub: createdUser.id,
			email: createdUser.email,
			emailVerified: true,
		});
	});

	it("rejects Google tokens whose email is not verified", async () => {
		googleTokens.verifyIdToken.mockResolvedValue({
			googleId: "google-unverified",
			email: "unverified@example.com",
			name: "Unverified",
			avatarUrl: null,
			emailVerified: false,
		});

		await expect(
			useCase.execute({ idToken: "google-id-token" }),
		).rejects.toMatchObject({
			code: "GOOGLE_EMAIL_NOT_VERIFIED",
			message: "Google email must be verified.",
			statusCode: 401,
			type: "business",
		});
		expect(users.findByGoogleId).not.toHaveBeenCalled();
		expect(tokens.signAccessToken).not.toHaveBeenCalled();
		expect(refreshTokens.save).not.toHaveBeenCalled();
	});

	it("does not translate safe business exceptions from the Google verifier", async () => {
		googleTokens.verifyIdToken.mockRejectedValue(
			new BusinessException(
				"INVALID_GOOGLE_TOKEN",
				"Invalid Google token.",
				401,
			),
		);

		await expect(
			useCase.execute({ idToken: "invalid-token" }),
		).rejects.toMatchObject({
			code: "INVALID_GOOGLE_TOKEN",
			message: "Invalid Google token.",
			statusCode: 401,
			type: "business",
		});
		expect(users.findByGoogleId).not.toHaveBeenCalled();
	});
});
