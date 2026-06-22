import { Argon2PasswordHasher } from "./argon2-password-hasher";

describe("Argon2PasswordHasher", () => {
	let hasher: Argon2PasswordHasher;

	beforeEach(() => {
		hasher = new Argon2PasswordHasher();
	});

	it("verifies a plaintext password against its generated hash", async () => {
		const hash = await hasher.hash("SecureP4ss!");

		await expect(hasher.verify("SecureP4ss!", hash)).resolves.toBe(true);
	});

	it("returns false when plaintext does not match the stored hash", async () => {
		const hash = await hasher.hash("SecureP4ss!");

		await expect(hasher.verify("WrongP4ss!", hash)).resolves.toBe(false);
	});
});
