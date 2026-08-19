import { BusinessException } from "../../../shared/exceptions/business.exception";
import type { PasswordResetRepository } from "../../domain/ports/password-reset.repository";
import { ResetPasswordUseCase } from "./reset-password.use-case";

describe("ResetPasswordUseCase", () => {
	let useCase: ResetPasswordUseCase;
	let resetTokens: {
		findByDigest: ReturnType<typeof vi.fn>;
		complete: ReturnType<typeof vi.fn>;
	};
	let tokenDigest: { digest: ReturnType<typeof vi.fn> };
	let passwordHasher: { hash: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		resetTokens = {
			findByDigest: vi.fn(),
			complete: vi.fn().mockResolvedValue(true),
		};
		tokenDigest = { digest: vi.fn().mockReturnValue("reset-digest") };
		passwordHasher = { hash: vi.fn().mockResolvedValue("hashed-password") };
		useCase = new ResetPasswordUseCase(
			resetTokens as never,
			tokenDigest as never,
			passwordHasher as never,
		);
	});

	it("hashes the new password and completes a valid reset", async () => {
		resetTokens.findByDigest.mockResolvedValue({
			id: "token-1",
			userId: "user-1",
			tokenDigest: "reset-digest",
			expiresAt: new Date(Date.now() + 60_000),
			consumedAt: null,
		});

		await expect(
			useCase.execute({ token: "raw-token", password: "new-password" }),
		).resolves.toBeUndefined();

		expect(passwordHasher.hash).toHaveBeenCalledWith("new-password");
		expect(resetTokens.complete).toHaveBeenCalledWith({
			tokenId: "token-1",
			userId: "user-1",
			passwordHash: "hashed-password",
			completedAt: expect.any(Date),
		});
	});

	it.each([
		[null, "PASSWORD_RESET_TOKEN_INVALID", 400],
		[
			{
				id: "token-1",
				userId: "user-1",
				tokenDigest: "reset-digest",
				expiresAt: new Date(Date.now() + 60_000),
				consumedAt: new Date(),
			},
			"PASSWORD_RESET_TOKEN_CONSUMED",
			409,
		],
		[
			{
				id: "token-1",
				userId: "user-1",
				tokenDigest: "reset-digest",
				expiresAt: new Date(Date.now() - 1_000),
				consumedAt: null,
			},
			"PASSWORD_RESET_TOKEN_EXPIRED",
			410,
		],
	])("rejects invalid token state (%s)", async (record, code, statusCode) => {
		resetTokens.findByDigest.mockResolvedValue(record);

		await expect(
			useCase.execute({ token: "raw-token", password: "new-password" }),
		).rejects.toMatchObject({ code, statusCode });
		expect(resetTokens.complete).not.toHaveBeenCalled();
	});

	it("rejects when atomic completion reports a consumed token", async () => {
		resetTokens.findByDigest.mockResolvedValue({
			id: "token-1",
			userId: "user-1",
			tokenDigest: "reset-digest",
			expiresAt: new Date(Date.now() + 60_000),
			consumedAt: null,
		});
		resetTokens.complete.mockResolvedValue(false);

		await expect(
			useCase.execute({ token: "raw-token", password: "new-password" }),
		).rejects.toBeInstanceOf(BusinessException);
		await expect(
			useCase.execute({ token: "raw-token", password: "new-password" }),
		).rejects.toMatchObject({ code: "PASSWORD_RESET_TOKEN_CONSUMED" });
	});
});
