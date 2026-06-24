import { JwtService } from "@nestjs/jwt";
import { JwtTokenService } from "./jwt-token.service";

describe("JwtTokenService", () => {
	const issuedAt = new Date("2026-06-22T12:00:00.000Z");
	const config = {
		jwtAccessSecret: "access-secret-with-at-least-32-chars",
		jwtRefreshSecret: "refresh-secret-with-at-least-32-chars",
		jwtAccessTtl: "15m",
		jwtRefreshTtl: "30d",
		googleClientId: undefined,
	};

	let service: JwtTokenService;
	let jwtService: JwtService;

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(issuedAt);

		jwtService = new JwtService();
		service = new JwtTokenService(jwtService, config);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("signs access tokens with a 15 minute expiration", async () => {
		const token = await service.signAccessToken({
			sub: "11111111-1111-1111-1111-111111111111",
			email: "new@example.com",
		});

		const decoded = jwtService.decode(token) as { exp: number; iat: number };
		const ttlInSeconds = decoded.exp - decoded.iat;

		expect(ttlInSeconds).toBe(15 * 60);
		expect(decoded.exp).toBe(Math.floor(issuedAt.getTime() / 1000) + 15 * 60);
	});

	it("signs refresh tokens and returns an expiresAt approximately 30 days from issuance", async () => {
		const refresh = await service.signRefreshToken({
			sub: "11111111-1111-1111-1111-111111111111",
		});

		const decoded = jwtService.decode(refresh.token) as { exp: number; iat: number; sub: string; email?: string };
		const expectedExpiresAt = new Date(issuedAt.getTime() + 30 * 24 * 60 * 60 * 1000);

		expect(decoded.sub).toBe("11111111-1111-1111-1111-111111111111");
		expect(decoded.email).toBeUndefined();
		expect(decoded.exp - decoded.iat).toBe(30 * 24 * 60 * 60);
		expect(refresh.expiresAt.getTime()).toBe(expectedExpiresAt.getTime());
	});

	it("signs distinct refresh tokens for the same payload within the same second", async () => {
		const payload = {
			sub: "11111111-1111-1111-1111-111111111111",
		};

		const first = await service.signRefreshToken(payload);
		const second = await service.signRefreshToken(payload);

		const firstDecoded = jwtService.decode(first.token) as { jti: string; sub: string };
		const secondDecoded = jwtService.decode(second.token) as { jti: string; sub: string };

		expect(first.token).not.toBe(second.token);
		expect(firstDecoded.sub).toBe(payload.sub);
		expect(secondDecoded.sub).toBe(payload.sub);
		expect(firstDecoded.jti).toEqual(expect.any(String));
		expect(secondDecoded.jti).toEqual(expect.any(String));
		expect(firstDecoded.jti).not.toBe(secondDecoded.jti);
	});
});
