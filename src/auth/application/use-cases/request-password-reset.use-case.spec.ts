import type { ConfigType } from "@nestjs/config";
import type mailConfig from "../../../config/mail.config";
import { RequestPasswordResetUseCase } from "./request-password-reset.use-case";

vi.mock("../services/random-token", () => ({
	createRandomToken: () => "reset-token",
}));

describe("RequestPasswordResetUseCase", () => {
	let useCase: RequestPasswordResetUseCase;
	let users: { findByEmail: ReturnType<typeof vi.fn> };
	let resetTokens: {
		replaceActiveForUser: ReturnType<typeof vi.fn>;
	};
	let tokenDigest: { digest: ReturnType<typeof vi.fn> };
	let mail: { sendPasswordResetEmail: ReturnType<typeof vi.fn> };
	const settings = {
		appPublicUrl: "http://localhost:3000",
		passwordResetTokenTtl: "30m",
	} as unknown as ConfigType<typeof mailConfig>;

	beforeEach(() => {
		users = { findByEmail: vi.fn() };
		resetTokens = {
			replaceActiveForUser: vi.fn().mockResolvedValue(undefined),
		};
		tokenDigest = { digest: vi.fn().mockReturnValue("reset-digest") };
		mail = { sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined) };
		useCase = new RequestPasswordResetUseCase(
			users as never,
			resetTokens as never,
			tokenDigest as never,
			mail as never,
			settings,
		);
	});

	it("stores a digest and sends a reset link for an existing user", async () => {
		users.findByEmail.mockResolvedValue({
			id: "user-1",
			name: "Jane",
			email: "jane@example.com",
		});

		await expect(
			useCase.execute({ email: "jane@example.com" }),
		).resolves.toBeUndefined();

		expect(resetTokens.replaceActiveForUser).toHaveBeenCalledWith({
			userId: "user-1",
			tokenDigest: "reset-digest",
			expiresAt: expect.any(Date),
			invalidatedAt: expect.any(Date),
		});
		expect(mail.sendPasswordResetEmail).toHaveBeenCalledWith({
			to: "jane@example.com",
			name: "Jane",
			resetUrl: expect.stringContaining(
				"http://localhost:3000/reset-password?token=",
			),
		});
	});

	it("does not reveal whether an email exists", async () => {
		users.findByEmail.mockResolvedValue(null);

		await expect(
			useCase.execute({ email: "unknown@example.com" }),
		).resolves.toBeUndefined();

		expect(resetTokens.replaceActiveForUser).not.toHaveBeenCalled();
		expect(mail.sendPasswordResetEmail).not.toHaveBeenCalled();
	});

	it("does not fail when email delivery fails", async () => {
		users.findByEmail.mockResolvedValue({
			id: "user-1",
			name: "Jane",
			email: "jane@example.com",
		});
		mail.sendPasswordResetEmail.mockRejectedValue(new Error("mail failed"));

		await expect(
			useCase.execute({ email: "jane@example.com" }),
		).resolves.toBeUndefined();
	});
});
