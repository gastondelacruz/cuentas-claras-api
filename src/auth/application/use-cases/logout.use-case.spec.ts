import { Test, type TestingModule } from "@nestjs/testing";
import { RefreshTokenRepository } from "../../domain/ports/refresh-token.repository";
import { TokenDigestService } from "../../domain/ports/token-digest.service";
import { LogoutUseCase } from "./logout.use-case";

describe("LogoutUseCase", () => {
	let useCase: LogoutUseCase;
	let refreshTokens: {
		save: ReturnType<typeof vi.fn>;
		findActiveByUserId: ReturnType<typeof vi.fn>;
		findByDigest: ReturnType<typeof vi.fn>;
		revoke: ReturnType<typeof vi.fn>;
		revokeAllByUserId: ReturnType<typeof vi.fn>;
	};
	let tokenDigestService: {
		digest: ReturnType<typeof vi.fn>;
	};

	beforeEach(async () => {
		refreshTokens = {
			save: vi.fn(),
			findActiveByUserId: vi.fn(),
			findByDigest: vi.fn(),
			revoke: vi.fn().mockResolvedValue(undefined),
			revokeAllByUserId: vi.fn(),
		};
		tokenDigestService = {
			digest: vi.fn().mockReturnValue("computed-digest"),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				LogoutUseCase,
				{ provide: RefreshTokenRepository, useValue: refreshTokens },
				{ provide: TokenDigestService, useValue: tokenDigestService },
			],
		}).compile();

		useCase = module.get(LogoutUseCase);
	});

	it("revokes an active refresh token when found, active, and owned by the requesting user", async () => {
		const activeToken = {
			id: "token-id-1",
			userId: "user-id-1",
			tokenHash: "some-hash",
			tokenDigest: "computed-digest",
			expiresAt: new Date(Date.now() + 10_000),
			revokedAt: null,
		};
		refreshTokens.findByDigest.mockResolvedValue(activeToken);

		await useCase.execute({ refreshToken: "raw-token", userId: "user-id-1" });

		expect(tokenDigestService.digest).toHaveBeenCalledWith("raw-token");
		expect(refreshTokens.findByDigest).toHaveBeenCalledWith("computed-digest");
		expect(refreshTokens.revoke).toHaveBeenCalledWith("token-id-1");
	});

	it("is idempotent when token is already revoked — save is NOT called", async () => {
		const revokedToken = {
			id: "token-id-2",
			userId: "user-id-1",
			tokenHash: "some-hash",
			tokenDigest: "computed-digest",
			expiresAt: new Date(Date.now() + 10_000),
			revokedAt: new Date(),
		};
		refreshTokens.findByDigest.mockResolvedValue(revokedToken);

		await useCase.execute({ refreshToken: "raw-token", userId: "user-id-1" });

		expect(refreshTokens.revoke).not.toHaveBeenCalled();
	});

	it("is idempotent when token is not found — save is NOT called", async () => {
		refreshTokens.findByDigest.mockResolvedValue(null);

		await useCase.execute({ refreshToken: "unknown-token", userId: "user-id-1" });

		expect(refreshTokens.revoke).not.toHaveBeenCalled();
	});

	it("is idempotent when token belongs to another user — save is NOT called", async () => {
		const tokenOfAnotherUser = {
			id: "token-id-3",
			userId: "other-user-id",
			tokenHash: "some-hash",
			tokenDigest: "computed-digest",
			expiresAt: new Date(Date.now() + 10_000),
			revokedAt: null,
		};
		refreshTokens.findByDigest.mockResolvedValue(tokenOfAnotherUser);

		await useCase.execute({ refreshToken: "raw-token", userId: "user-id-1" });

		expect(refreshTokens.revoke).not.toHaveBeenCalled();
	});
});
