import { AuthController } from "./auth.controller";

describe("AuthController password reset endpoints", () => {
	let controller: AuthController;
	let requestPasswordResetUseCase: { execute: ReturnType<typeof vi.fn> };
	let resetPasswordUseCase: { execute: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		requestPasswordResetUseCase = {
			execute: vi.fn().mockResolvedValue(undefined),
		};
		resetPasswordUseCase = { execute: vi.fn().mockResolvedValue(undefined) };
		controller = new AuthController(
			{} as never,
			{} as never,
			requestPasswordResetUseCase as never,
			resetPasswordUseCase as never,
			{} as never,
			{} as never,
			{} as never,
			{} as never,
			{} as never,
		);
	});

	it("maps a forgot-password request to the use case", async () => {
		await expect(
			controller.requestPasswordReset({ email: "user@example.com" }),
		).resolves.toBeUndefined();

		expect(requestPasswordResetUseCase.execute).toHaveBeenCalledWith({
			email: "user@example.com",
		});
	});

	it("maps a reset-password request to the use case", async () => {
		await expect(
			controller.resetPassword({ token: "token", password: "new-password" }),
		).resolves.toBeUndefined();

		expect(resetPasswordUseCase.execute).toHaveBeenCalledWith({
			token: "token",
			password: "new-password",
		});
	});
});
