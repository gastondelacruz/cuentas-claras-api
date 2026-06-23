import { Test, type TestingModule } from "@nestjs/testing";
import { BusinessException } from "../../../shared/exceptions/business.exception";
import { AuthUserRepository } from "../../domain/ports/auth-user.repository";
import { PasswordHasher } from "../../domain/ports/password-hasher";
import { RefreshTokenRepository } from "../../domain/ports/refresh-token.repository";
import { TokenService } from "../../domain/ports/token.service";
import { LoginUseCase } from "./login.use-case";

describe("LoginUseCase", () => {
	let useCase: LoginUseCase;
	let users: {
		findByEmail: ReturnType<typeof vi.fn>;
		findByEmailForLogin: ReturnType<typeof vi.fn>;
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
			findByEmailForLogin: vi.fn(),
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
				LoginUseCase,
				{ provide: AuthUserRepository, useValue: users },
				{ provide: PasswordHasher, useValue: passwordHasher },
				{ provide: TokenService, useValue: tokens },
				{ provide: RefreshTokenRepository, useValue: refreshTokens },
			],
		}).compile();

		useCase = module.get(LoginUseCase);
	});

	it("verifies credentials, issues tokens, stores the refresh token hash, and returns the auth payload without passwordHash", async () => {
		const expiresAt = new Date("2026-07-22T10:00:00.000Z");
		const loginUser = {
			id: "11111111-1111-1111-1111-111111111111",
			name: "Jane",
			email: "jane@example.com",
			passwordHash: "stored-hash",
		};

		users.findByEmailForLogin.mockResolvedValue(loginUser);
		passwordHasher.verify.mockResolvedValue(true);
		tokens.signAccessToken.mockResolvedValue("access-token");
		tokens.signRefreshToken.mockResolvedValue({
			token: "refresh-token",
			expiresAt,
		});
		passwordHasher.hash.mockResolvedValue("hashed-refresh-token");
		refreshTokens.save.mockResolvedValue(undefined);

		const result = await useCase.execute({
			email: "jane@example.com",
			password: "SecureP4ss!",
		});

		expect(result).toEqual({
			accessToken: "access-token",
			refreshToken: "refresh-token",
			user: {
				id: loginUser.id,
				name: loginUser.name,
				email: loginUser.email,
			},
		});
		expect(result.user).not.toHaveProperty("passwordHash");
		expect(users.findByEmailForLogin).toHaveBeenCalledWith("jane@example.com");
		expect(passwordHasher.verify).toHaveBeenCalledWith(
			"SecureP4ss!",
			"stored-hash",
		);
		expect(tokens.signAccessToken).toHaveBeenCalledWith({
			sub: loginUser.id,
			email: loginUser.email,
		});
		expect(tokens.signRefreshToken).toHaveBeenCalledWith({ sub: loginUser.id });
		expect(passwordHasher.hash).toHaveBeenCalledWith("refresh-token");
		expect(refreshTokens.save).toHaveBeenCalledWith({
			userId: loginUser.id,
			tokenHash: "hashed-refresh-token",
			expiresAt,
		});
	});

	it("throws INVALID_CREDENTIALS when the email does not exist", async () => {
		users.findByEmailForLogin.mockResolvedValue(null);

		await expect(
			useCase.execute({ email: "nobody@example.com", password: "any" }),
		).rejects.toMatchObject({
			code: "INVALID_CREDENTIALS",
			message: "Invalid credentials.",
			statusCode: 401,
			type: "business",
		});
		expect(passwordHasher.verify).not.toHaveBeenCalled();
		expect(tokens.signAccessToken).not.toHaveBeenCalled();
		expect(refreshTokens.save).not.toHaveBeenCalled();
	});

	it("throws INVALID_CREDENTIALS for a Google-only account (no passwordHash)", async () => {
		users.findByEmailForLogin.mockResolvedValue({
			id: "22222222-2222-2222-2222-222222222222",
			name: "Google User",
			email: "google@example.com",
			passwordHash: null,
		});

		await expect(
			useCase.execute({ email: "google@example.com", password: "any" }),
		).rejects.toMatchObject({
			code: "INVALID_CREDENTIALS",
			message: "Invalid credentials.",
			statusCode: 401,
			type: "business",
		});
		expect(passwordHasher.verify).not.toHaveBeenCalled();
		expect(tokens.signAccessToken).not.toHaveBeenCalled();
		expect(refreshTokens.save).not.toHaveBeenCalled();
	});

	it("throws INVALID_CREDENTIALS when the password does not match the stored hash", async () => {
		users.findByEmailForLogin.mockResolvedValue({
			id: "33333333-3333-3333-3333-333333333333",
			name: "Jane",
			email: "jane@example.com",
			passwordHash: "stored-hash",
		});
		passwordHasher.verify.mockResolvedValue(false);

		await expect(
			useCase.execute({ email: "jane@example.com", password: "WrongPass!" }),
		).rejects.toMatchObject({
			code: "INVALID_CREDENTIALS",
			message: "Invalid credentials.",
			statusCode: 401,
			type: "business",
		});
		expect(passwordHasher.verify).toHaveBeenCalledWith(
			"WrongPass!",
			"stored-hash",
		);
		expect(tokens.signAccessToken).not.toHaveBeenCalled();
		expect(refreshTokens.save).not.toHaveBeenCalled();
	});
});
