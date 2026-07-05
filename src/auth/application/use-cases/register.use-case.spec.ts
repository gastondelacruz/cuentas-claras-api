import { Test, type TestingModule } from "@nestjs/testing";
import { BusinessException } from "../../../shared/exceptions/business.exception";
import mailConfig from "../../../config/mail.config";
import { MailDeliveryPort } from "../../../shared/mail/domain/ports/mail-delivery.port";
import { AuthUserRepository } from "../../domain/ports/auth-user.repository";
import { EmailVerificationTokenRepository } from "../../domain/ports/email-verification-token.repository";
import { PasswordHasher } from "../../domain/ports/password-hasher";
import { RefreshTokenRepository } from "../../domain/ports/refresh-token.repository";
import { TokenDigestService } from "../../domain/ports/token-digest.service";
import { TokenService } from "../../domain/ports/token.service";
import { RegisterUseCase } from "./register.use-case";

vi.mock("../services/random-token", () => ({
	createRandomToken: () => "verification-token",
}));

describe("RegisterUseCase", () => {
	let useCase: RegisterUseCase;
	let users: {
		findByEmail: ReturnType<typeof vi.fn>;
		createUserWithDefaultAccount: ReturnType<typeof vi.fn>;
	};
	let passwordHasher: {
		hash: ReturnType<typeof vi.fn>;
		verify: ReturnType<typeof vi.fn>;
	};
	let tokens: {
		signAccessToken: ReturnType<typeof vi.fn>;
		signRefreshToken: ReturnType<typeof vi.fn>;
	};
	let refreshTokens: {
		save: ReturnType<typeof vi.fn>;
	};
	let verificationTokens: {
		save: ReturnType<typeof vi.fn>;
	};
	let mail: {
		sendVerificationEmail: ReturnType<typeof vi.fn>;
	};
	let tokenDigestService: {
		digest: ReturnType<typeof vi.fn>;
	};

	beforeEach(async () => {
		users = {
			findByEmail: vi.fn(),
			createUserWithDefaultAccount: vi.fn(),
		};
		passwordHasher = {
			hash: vi.fn(),
			verify: vi.fn(),
		};
		tokens = {
			signAccessToken: vi.fn(),
			signRefreshToken: vi.fn(),
		};
		refreshTokens = {
			save: vi.fn(),
		};
		verificationTokens = {
			save: vi.fn(),
		};
		mail = {
			sendVerificationEmail: vi.fn(),
		};
		tokenDigestService = {
			digest: vi.fn().mockReturnValue("computed-token-digest"),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				RegisterUseCase,
				{ provide: AuthUserRepository, useValue: users },
				{ provide: PasswordHasher, useValue: passwordHasher },
				{ provide: TokenService, useValue: tokens },
				{ provide: RefreshTokenRepository, useValue: refreshTokens },
				{ provide: TokenDigestService, useValue: tokenDigestService },
				{ provide: EmailVerificationTokenRepository, useValue: verificationTokens },
				{ provide: MailDeliveryPort, useValue: mail },
				{
					provide: mailConfig.KEY,
					useValue: {
						appPublicUrl: "http://localhost:3000",
						verificationTokenTtl: "24h",
					},
				},
			],
		}).compile();

		useCase = module.get(RegisterUseCase);
	});

	it("creates a user with a password hash, issues tokens, stores the refresh token hash, and returns the auth payload", async () => {
		const expiresAt = new Date("2026-07-22T10:00:00.000Z");
		const createdUser = {
			id: "11111111-1111-1111-1111-111111111111",
			name: "Jane",
			email: "new@example.com",
		};

		users.findByEmail.mockResolvedValue(null);
		passwordHasher.hash
			.mockResolvedValueOnce("hashed-password")
			.mockResolvedValueOnce("hashed-refresh-token");
		users.createUserWithDefaultAccount.mockResolvedValue(createdUser);
		tokens.signAccessToken.mockResolvedValue("access-token");
		tokens.signRefreshToken.mockResolvedValue({
			token: "refresh-token",
			expiresAt,
		});
		refreshTokens.save.mockResolvedValue(undefined);
		verificationTokens.save.mockResolvedValue(undefined);
		mail.sendVerificationEmail.mockResolvedValue(undefined);

		await expect(
			useCase.execute({
				name: "Jane",
				email: "new@example.com",
				password: "SecureP4ss!",
			}),
		).resolves.toEqual({
			accessToken: "access-token",
			refreshToken: "refresh-token",
			user: createdUser,
		});
		expect(users.findByEmail).toHaveBeenCalledWith("new@example.com");
		expect(passwordHasher.hash).toHaveBeenNthCalledWith(1, "SecureP4ss!");
		expect(users.createUserWithDefaultAccount).toHaveBeenCalledWith(
			{
				name: "Jane",
				email: "new@example.com",
				passwordHash: "hashed-password",
			},
			{
				name: "Cuenta principal",
				currency: "ARS",
				kind: "cash",
			},
		);
		expect(tokens.signAccessToken).toHaveBeenCalledWith({
			sub: createdUser.id,
			email: createdUser.email,
			emailVerified: false,
		});
		expect(tokens.signRefreshToken).toHaveBeenCalledWith({
			sub: createdUser.id,
		});
		expect(passwordHasher.hash).toHaveBeenNthCalledWith(2, "refresh-token");
		expect(tokenDigestService.digest).toHaveBeenCalledWith("refresh-token");
		expect(refreshTokens.save).toHaveBeenCalledWith({
			userId: createdUser.id,
			tokenHash: "hashed-refresh-token",
			tokenDigest: "computed-token-digest",
			expiresAt,
		});
		expect(verificationTokens.save).toHaveBeenCalledWith({
			userId: createdUser.id,
			tokenDigest: "computed-token-digest",
			expiresAt: expect.any(Date),
		});
		expect(mail.sendVerificationEmail).toHaveBeenCalledWith({
			to: createdUser.email,
			name: createdUser.name,
			verificationUrl: expect.stringContaining("http://localhost:3000/verify-email?token="),
		});
		expect(
			users.createUserWithDefaultAccount.mock.calls[0][0].passwordHash,
		).not.toBe(
			"SecureP4ss!",
		);
		expect(refreshTokens.save.mock.calls[0][0].tokenHash).not.toBe(
			"refresh-token",
		);
	});

	it("builds custom-scheme verification links without an extra slash", async () => {
		const customSchemeModule: TestingModule = await Test.createTestingModule({
			providers: [
				RegisterUseCase,
				{ provide: AuthUserRepository, useValue: users },
				{ provide: PasswordHasher, useValue: passwordHasher },
				{ provide: TokenService, useValue: tokens },
				{ provide: RefreshTokenRepository, useValue: refreshTokens },
				{ provide: TokenDigestService, useValue: tokenDigestService },
				{ provide: EmailVerificationTokenRepository, useValue: verificationTokens },
				{ provide: MailDeliveryPort, useValue: mail },
				{
					provide: mailConfig.KEY,
					useValue: {
						appPublicUrl: "cuentasclaras://",
						verificationTokenTtl: "24h",
					},
				},
			],
		}).compile();
		const customSchemeUseCase = customSchemeModule.get(RegisterUseCase);
		const createdUser = {
			id: "11111111-1111-1111-1111-111111111111",
			name: "Jane",
			email: "new@example.com",
		};

		users.findByEmail.mockResolvedValue(null);
		passwordHasher.hash
			.mockResolvedValueOnce("hashed-password")
			.mockResolvedValueOnce("hashed-refresh-token");
		users.createUserWithDefaultAccount.mockResolvedValue(createdUser);
		tokens.signAccessToken.mockResolvedValue("access-token");
		tokens.signRefreshToken.mockResolvedValue({
			token: "refresh-token",
			expiresAt: new Date("2026-07-22T10:00:00.000Z"),
		});
		refreshTokens.save.mockResolvedValue(undefined);
		verificationTokens.save.mockResolvedValue(undefined);
		mail.sendVerificationEmail.mockResolvedValue(undefined);

		await customSchemeUseCase.execute({
			name: "Jane",
			email: "new@example.com",
			password: "SecureP4ss!",
		});

		expect(mail.sendVerificationEmail).toHaveBeenCalledWith({
			to: createdUser.email,
			name: createdUser.name,
			verificationUrl: "cuentasclaras://verify-email?token=verification-token",
		});
	});

	it("rejects duplicate email with a business exception and does not hash or persist anything", async () => {
		users.findByEmail.mockResolvedValue({
			id: "22222222-2222-2222-2222-222222222222",
			name: "Existing",
			email: "taken@example.com",
		});

		await expect(
			useCase.execute({
				name: "Dup",
				email: "taken@example.com",
				password: "SecureP4ss!",
			}),
		).rejects.toMatchObject({
			code: "EMAIL_ALREADY_EXISTS",
			message: "Email already registered.",
			statusCode: 409,
			type: "business",
		});
		expect(passwordHasher.hash).not.toHaveBeenCalled();
		expect(users.createUserWithDefaultAccount).not.toHaveBeenCalled();
		expect(tokens.signAccessToken).not.toHaveBeenCalled();
		expect(tokens.signRefreshToken).not.toHaveBeenCalled();
		expect(refreshTokens.save).not.toHaveBeenCalled();
		expect(verificationTokens.save).not.toHaveBeenCalled();
		expect(mail.sendVerificationEmail).not.toHaveBeenCalled();
	});
});
