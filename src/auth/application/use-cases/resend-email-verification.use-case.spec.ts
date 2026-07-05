import { MailDeliveryPort } from "../../../shared/mail/domain/ports/mail-delivery.port";
import { AuthUserRepository } from "../../domain/ports/auth-user.repository";
import { EmailVerificationTokenRepository } from "../../domain/ports/email-verification-token.repository";
import { TokenDigestService } from "../../domain/ports/token-digest.service";
import { ResendEmailVerificationUseCase } from "./resend-email-verification.use-case";

describe("ResendEmailVerificationUseCase", () => {
	let useCase: ResendEmailVerificationUseCase;
	let users: {
		findById: ReturnType<typeof vi.fn>;
	};
	let verificationTokens: {
		invalidateActiveForUser: ReturnType<typeof vi.fn>;
		save: ReturnType<typeof vi.fn>;
	};
	let tokenDigest: {
		digest: ReturnType<typeof vi.fn>;
	};
	let mail: {
		sendVerificationEmail: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		users = {
			findById: vi.fn(),
		};
		verificationTokens = {
			invalidateActiveForUser: vi.fn().mockResolvedValue(undefined),
			save: vi.fn().mockResolvedValue(undefined),
		};
		tokenDigest = {
			digest: vi.fn().mockReturnValue("new-token-digest"),
		};
		mail = {
			sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
		};
		useCase = new ResendEmailVerificationUseCase(
			users as unknown as AuthUserRepository,
			verificationTokens as unknown as EmailVerificationTokenRepository,
			tokenDigest as unknown as TokenDigestService,
			mail as unknown as MailDeliveryPort,
			{
				appPublicUrl: "http://localhost:3000",
				verificationTokenTtl: "24h",
			} as never,
		);
	});

	it("invalidates existing active tokens before storing and sending a replacement", async () => {
		users.findById.mockResolvedValue({
			id: "user-1",
			name: "Jane",
			email: "jane@example.com",
			emailVerifiedAt: null,
		});

		await expect(useCase.execute({ userId: "user-1" })).resolves.toBeUndefined();

		expect(verificationTokens.invalidateActiveForUser).toHaveBeenCalledWith("user-1", expect.any(Date));
		expect(verificationTokens.save).toHaveBeenCalledWith({
			userId: "user-1",
			tokenDigest: "new-token-digest",
			expiresAt: expect.any(Date),
		});
		expect(mail.sendVerificationEmail).toHaveBeenCalledWith({
			to: "jane@example.com",
			name: "Jane",
			verificationUrl: expect.stringContaining("http://localhost:3000/verify-email?token="),
		});
	});

	it("builds verification links with a custom mobile scheme", async () => {
		useCase = new ResendEmailVerificationUseCase(
			users as unknown as AuthUserRepository,
			verificationTokens as unknown as EmailVerificationTokenRepository,
			tokenDigest as unknown as TokenDigestService,
			mail as unknown as MailDeliveryPort,
			{
				appPublicUrl: "cuentasclaras://",
				verificationTokenTtl: "24h",
			} as never,
		);
		users.findById.mockResolvedValue({
			id: "user-1",
			name: "Jane",
			email: "jane@example.com",
			emailVerifiedAt: null,
		});

		await expect(useCase.execute({ userId: "user-1" })).resolves.toBeUndefined();

		const emailInput = mail.sendVerificationEmail.mock.calls[0][0];
		expect(emailInput.verificationUrl).toMatch(/^cuentasclaras:\/\/verify-email\?token=.+$/);
		expect(emailInput.verificationUrl).not.toContain("cuentasclaras:///");
	});

	it("builds verification links with an HTTPS base URL", async () => {
		useCase = new ResendEmailVerificationUseCase(
			users as unknown as AuthUserRepository,
			verificationTokens as unknown as EmailVerificationTokenRepository,
			tokenDigest as unknown as TokenDigestService,
			mail as unknown as MailDeliveryPort,
			{
				appPublicUrl: "https://links.cuentasclaras.app/",
				verificationTokenTtl: "24h",
			} as never,
		);
		users.findById.mockResolvedValue({
			id: "user-1",
			name: "Jane",
			email: "jane@example.com",
			emailVerifiedAt: null,
		});

		await expect(useCase.execute({ userId: "user-1" })).resolves.toBeUndefined();

		const emailInput = mail.sendVerificationEmail.mock.calls[0][0];
		expect(emailInput.verificationUrl).toMatch(/^https:\/\/links\.cuentasclaras\.app\/verify-email\?token=.+$/);
		expect(emailInput.verificationUrl).not.toContain("app//verify-email");
	});

	it("keeps durable token state when mail delivery fails", async () => {
		users.findById.mockResolvedValue({
			id: "user-1",
			name: "Jane",
			email: "jane@example.com",
			emailVerifiedAt: null,
		});
		mail.sendVerificationEmail.mockRejectedValue(new Error("mail failed"));

		await expect(useCase.execute({ userId: "user-1" })).resolves.toBeUndefined();

		expect(verificationTokens.invalidateActiveForUser).toHaveBeenCalled();
		expect(verificationTokens.save).toHaveBeenCalled();
	});
});
