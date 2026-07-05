import { buildAppActionLink } from "./app-action-link";

describe("buildAppActionLink", () => {
	it("builds custom-scheme links without adding a third slash", () => {
		expect(buildAppActionLink("cuentasclaras://", "/verify-email", { token: "abc123" })).toBe(
			"cuentasclaras://verify-email?token=abc123",
		);
	});

	it("preserves a custom-scheme authority when configured", () => {
		expect(buildAppActionLink("cuentasclaras://app", "group-invitations/accept", { token: "abc123" })).toBe(
			"cuentasclaras://app/group-invitations/accept?token=abc123",
		);
	});

	it("builds HTTPS links with or without a trailing slash", () => {
		expect(buildAppActionLink("https://links.cuentasclaras.app", "verify-email", { token: "abc123" })).toBe(
			"https://links.cuentasclaras.app/verify-email?token=abc123",
		);
		expect(buildAppActionLink("https://links.cuentasclaras.app/", "/group-invitations/accept", { token: "abc123" })).toBe(
			"https://links.cuentasclaras.app/group-invitations/accept?token=abc123",
		);
	});

	it("encodes query values", () => {
		expect(buildAppActionLink("cuentasclaras://", "verify-email", { token: "a b+c" })).toBe(
			"cuentasclaras://verify-email?token=a+b%2Bc",
		);
	});
});
