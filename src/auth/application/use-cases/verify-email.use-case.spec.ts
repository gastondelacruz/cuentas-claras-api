import { BusinessException } from "../../../shared/exceptions/business.exception";
import { AuthUserRepository } from "../../domain/ports/auth-user.repository";
import { EmailVerificationTokenRepository } from "../../domain/ports/email-verification-token.repository";
import { TokenDigestService } from "../../domain/ports/token-digest.service";
import { VerifyEmailUseCase } from "./verify-email.use-case";

describe("VerifyEmailUseCase", () => {
	let useCase: VerifyEmailUseCase;
	let verificationTokens: {
		findByDigest: ReturnType<typeof vi.fn>;
		consume: ReturnType<typeof vi.fn>;
	};
	let users: {
		markEmailVerified: ReturnType<typeof vi.fn>;
	};
	let tokenDigest: {
		digest: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		verificationTokens = {
			findByDigest: vi.fn(),
			consume: vi.fn().mockResolvedValue(true),
		};
		users = {
			markEmailVerified: vi.fn(),
		};
		tokenDigest = {
			digest: vi.fn().mockReturnValue("token-digest"),
		};
		useCase = new VerifyEmailUseCase(
			verificationTokens as never,
			users as never,
			tokenDigest as never,
		);
	});

	it("marks the user verified and consumes a valid token", async () => {
		verificationTokens.findByDigest.mockResolvedValue({
			id: "token-1",
			userId: "user-1",
			tokenDigest: "token-digest",
			expiresAt: new Date(Date.now() + 60_000),
			consumedAt: null,
		});

		await expect(useCase.execute({ token: "raw-token" })).resolves.toBeUndefined();

		expect(tokenDigest.digest).toHaveBeenCalledWith("raw-token");
		expect(users.markEmailVerified).toHaveBeenCalledWith("user-1", expect.any(Date));
		expect(verificationTokens.consume).toHaveBeenCalledWith("token-1", expect.any(Date));
	});

	it("rejects invalid tokens with a stable business code", async () => {
		verificationTokens.findByDigest.mockResolvedValue(null);

		await expect(useCase.execute({ token: "raw-token" })).rejects.toMatchObject({
			code: "EMAIL_VERIFICATION_TOKEN_INVALID",
			statusCode: 400,
		});
		expect(verificationTokens.consume).not.toHaveBeenCalled();
		expect(users.markEmailVerified).not.toHaveBeenCalled();
	});

	it("rejects consumed tokens with a stable business code", async () => {
		verificationTokens.findByDigest.mockResolvedValue({
			id: "token-1",
			userId: "user-1",
			tokenDigest: "token-digest",
			expiresAt: new Date(Date.now() + 60_000),
			consumedAt: new Date(),
		});

		await expect(useCase.execute({ token: "raw-token" })).rejects.toMatchObject({
			code: "EMAIL_VERIFICATION_TOKEN_CONSUMED",
			statusCode: 409,
		});
		expect(verificationTokens.consume).not.toHaveBeenCalled();
		expect(users.markEmailVerified).not.toHaveBeenCalled();
	});

	it("rejects expired tokens with a stable business code", async () => {
		verificationTokens.findByDigest.mockResolvedValue({
			id: "token-1",
			userId: "user-1",
			tokenDigest: "token-digest",
			expiresAt: new Date(Date.now() - 1_000),
			consumedAt: null,
		});

		await expect(useCase.execute({ token: "raw-token" })).rejects.toMatchObject({
			code: "EMAIL_VERIFICATION_TOKEN_EXPIRED",
			statusCode: 410,
		});
		await expect(useCase.execute({ token: "raw-token" })).rejects.toBeInstanceOf(BusinessException);
	});

	it("rejects tokens exactly at the expiry boundary", async () => {
		const now = new Date("2026-07-05T10:00:00.000Z");
		vi.useFakeTimers();
		vi.setSystemTime(now);
		verificationTokens.findByDigest.mockResolvedValue({
			id: "token-1",
			userId: "user-1",
			tokenDigest: "token-digest",
			expiresAt: now,
			consumedAt: null,
		});

		await expect(useCase.execute({ token: "raw-token" })).rejects.toMatchObject({
			code: "EMAIL_VERIFICATION_TOKEN_EXPIRED",
			statusCode: 410,
		});
		expect(verificationTokens.consume).not.toHaveBeenCalled();
		expect(users.markEmailVerified).not.toHaveBeenCalled();
		vi.useRealTimers();
	});

	it("rejects when atomic token consumption reports a consumed token", async () => {
		verificationTokens.findByDigest.mockResolvedValue({
			id: "token-1",
			userId: "user-1",
			tokenDigest: "token-digest",
			expiresAt: new Date(Date.now() + 60_000),
			consumedAt: null,
		});
		verificationTokens.consume.mockResolvedValue(false);

		await expect(useCase.execute({ token: "raw-token" })).rejects.toMatchObject({
			code: "EMAIL_VERIFICATION_TOKEN_CONSUMED",
			statusCode: 409,
		});
		expect(users.markEmailVerified).not.toHaveBeenCalled();
	});
});
