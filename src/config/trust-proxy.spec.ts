import { describe, expect, it, vi } from "vitest";
import { configureTrustProxy } from "./trust-proxy";

describe("configureTrustProxy", () => {
	it("does not trust proxy headers by default", () => {
		const app = { set: vi.fn() };

		configureTrustProxy(app, 0);

		expect(app.set).not.toHaveBeenCalled();
	});

	it("trusts the configured number of proxy hops", () => {
		const app = { set: vi.fn() };

		configureTrustProxy(app, 1);

		expect(app.set).toHaveBeenCalledWith("trust proxy", 1);
	});
});
