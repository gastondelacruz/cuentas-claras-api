import type { ConfigType } from "@nestjs/config";
import authConfig from "../../../config/auth.config";
import { JwtStrategy } from "./jwt.strategy";

describe("JwtStrategy", () => {
	it("maps a valid access token payload to the request user shape", () => {
		const strategy = new JwtStrategy(createAuthConfig());

		expect(
			strategy.validate({
				sub: "user-1",
				email: "user@example.com",
			}),
		).toEqual({ userId: "user-1", email: "user@example.com" });
	});

	it("keeps the authenticated user scoped to the token subject", () => {
		const strategy = new JwtStrategy(createAuthConfig());

		expect(
			strategy.validate({
				sub: "user-2",
				email: "other@example.com",
			}),
		).toEqual({ userId: "user-2", email: "other@example.com" });
	});
});

function createAuthConfig(): ConfigType<typeof authConfig> {
	return {
		jwtAccessSecret: "access-secret-with-at-least-32-chars",
		jwtRefreshSecret: "refresh-secret-with-at-least-32-chars",
		accessTokenTtl: "15m",
		refreshTokenTtl: "7d",
	};
}
