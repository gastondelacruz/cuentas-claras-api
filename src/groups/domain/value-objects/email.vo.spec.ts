import { Email } from "./email.vo";

describe("Email", () => {
	it("accepts and normalizes a valid email", () => {
		const email = new Email(" Ana@Example.COM ");

		expect(email.getValue()).toBe("ana@example.com");
		expect(email.value).toBe("ana@example.com");
	});

	it("rejects invalid and null-ish email inputs", () => {
		expect(() => new Email("invalid-email")).toThrow("Email must be valid.");
		expect(() => new Email("")).toThrow("Email must be valid.");
		expect(() => new Email("   ")).toThrow("Email must be valid.");
		expect(() => new Email(null as unknown as string)).toThrow();
		expect(() => new Email(undefined as unknown as string)).toThrow();
	});
});
