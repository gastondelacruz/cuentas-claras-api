import { afterEach, describe, expect, it } from "vitest";
import { getAuthRateLimit, rateLimitDefaults } from "./rate-limit.config";

const originalAuthLimit = process.env.THROTTLE_AUTH_LIMIT;
const originalAuthTtl = process.env.THROTTLE_AUTH_TTL;

const restoreEnv = (key: string, value: string | undefined): void => {
	if (value === undefined) {
		delete process.env[key];
		return;
	}

	process.env[key] = value;
};

describe("getAuthRateLimit", () => {
	afterEach(() => {
		restoreEnv("THROTTLE_AUTH_LIMIT", originalAuthLimit);
		restoreEnv("THROTTLE_AUTH_TTL", originalAuthTtl);
	});

	it("resolves auth values lazily from the current environment", () => {
		delete process.env.THROTTLE_AUTH_LIMIT;
		delete process.env.THROTTLE_AUTH_TTL;
		const options = getAuthRateLimit();

		process.env.THROTTLE_AUTH_LIMIT = "2";
		process.env.THROTTLE_AUTH_TTL = "30000";

		expect(options.limit()).toBe(2);
		expect(options.ttl()).toBe(30_000);
	});

	it("falls back to auth defaults for invalid values", () => {
		const options = getAuthRateLimit();
		process.env.THROTTLE_AUTH_LIMIT = "0";
		process.env.THROTTLE_AUTH_TTL = "invalid";

		expect(options.limit()).toBe(rateLimitDefaults.auth.limit);
		expect(options.ttl()).toBe(rateLimitDefaults.auth.ttl);
	});
});
