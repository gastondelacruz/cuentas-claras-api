import { Test, type TestingModule } from "@nestjs/testing";
import { BusinessException } from "../../../shared/exceptions/business.exception";
import { AuthUserRepository } from "../../domain/ports/auth-user.repository";
import { PasswordHasher } from "../../domain/ports/password-hasher";
import { RefreshTokenRepository } from "../../domain/ports/refresh-token.repository";
import { TokenService } from "../../domain/ports/token.service";
import { RegisterUseCase } from "./register.use-case";

describe("RegisterUseCase", () => {
	let useCase: RegisterUseCase;
	let users: {
		findByEmail: ReturnType<typeof vi.fn>;
		createWithPassword: ReturnType<typeof vi.fn>;
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

	beforeEach(async () => {
		users = {
			findByEmail: vi.fn(),
			createWithPassword: vi.fn(),
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

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				RegisterUseCase,
				{ provide: AuthUserRepository, useValue: users },
				{ provide: PasswordHasher, useValue: passwordHasher },
				{ provide: TokenService, useValue: tokens },
				{ provide: RefreshTokenRepository, useValue: refreshTokens },
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
		users.createWithPassword.mockResolvedValue(createdUser);
		tokens.signAccessToken.mockResolvedValue("access-token");
		tokens.signRefreshToken.mockResolvedValue({
			token: "refresh-token",
			expiresAt,
		});
		refreshTokens.save.mockResolvedValue(undefined);

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
		expect(users.createWithPassword).toHaveBeenCalledWith({
			name: "Jane",
			email: "new@example.com",
			passwordHash: "hashed-password",
		});
		expect(tokens.signAccessToken).toHaveBeenCalledWith({
			sub: createdUser.id,
			email: createdUser.email,
		});
		expect(tokens.signRefreshToken).toHaveBeenCalledWith({
			sub: createdUser.id,
		});
		expect(passwordHasher.hash).toHaveBeenNthCalledWith(2, "refresh-token");
		expect(refreshTokens.save).toHaveBeenCalledWith({
			userId: createdUser.id,
			tokenHash: "hashed-refresh-token",
			expiresAt,
		});
		expect(users.createWithPassword.mock.calls[0][0].passwordHash).not.toBe(
			"SecureP4ss!",
		);
		expect(refreshTokens.save.mock.calls[0][0].tokenHash).not.toBe(
			"refresh-token",
		);
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
		).rejects.toMatchObject<Partial<BusinessException>>({
			code: "EMAIL_ALREADY_EXISTS",
			message: "Email already registered.",
			statusCode: 409,
			type: "business",
		});
		expect(passwordHasher.hash).not.toHaveBeenCalled();
		expect(users.createWithPassword).not.toHaveBeenCalled();
		expect(tokens.signAccessToken).not.toHaveBeenCalled();
		expect(tokens.signRefreshToken).not.toHaveBeenCalled();
		expect(refreshTokens.save).not.toHaveBeenCalled();
	});
});
