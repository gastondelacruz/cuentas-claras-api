import { createHmac } from "node:crypto";
import { HmacTokenDigestService } from "./hmac-token-digest.service";

const SECRET = "test-digest-secret-with-at-least-32-chars";

describe("HmacTokenDigestService", () => {
	it("returns the HMAC-SHA256 hex digest of the raw token", () => {
		const service = new HmacTokenDigestService({ refreshTokenDigestSecret: SECRET });
		const rawToken = "some-raw-refresh-token";
		const expected = createHmac("sha256", SECRET).update(rawToken).digest("hex");

		expect(service.digest(rawToken)).toBe(expected);
	});

	it("is deterministic — same input always produces the same output", () => {
		const service = new HmacTokenDigestService({ refreshTokenDigestSecret: SECRET });
		const rawToken = "another-refresh-token-value";

		const first = service.digest(rawToken);
		const second = service.digest(rawToken);

		expect(first).toBe(second);
		// Sanity: it is a non-empty hex string
		expect(first).toMatch(/^[0-9a-f]{64}$/);
	});

	it("is secret-sensitive — different secrets produce different digests for the same token", () => {
		const serviceA = new HmacTokenDigestService({
			refreshTokenDigestSecret: "secret-aaaa-bbbb-cccc-dddd-eeee-ffff-0001",
		});
		const serviceB = new HmacTokenDigestService({
			refreshTokenDigestSecret: "secret-aaaa-bbbb-cccc-dddd-eeee-ffff-0002",
		});
		const rawToken = "shared-raw-token";

		expect(serviceA.digest(rawToken)).not.toBe(serviceB.digest(rawToken));
	});
});
