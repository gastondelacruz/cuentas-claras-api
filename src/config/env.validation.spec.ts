import { envValidationSchema } from "./env.validation";

const validBaseEnv = {
	NODE_ENV: "production",
	PORT: 3000,
	DATABASE_URL: "postgresql://user:password@localhost:5432/cuentas_claras",
	JWT_ACCESS_SECRET: "access-secret-with-at-least-32-chars",
	JWT_REFRESH_SECRET: "refresh-secret-with-at-least-32-chars",
	REFRESH_TOKEN_DIGEST_SECRET: "digest-secret-with-at-least-32-chars",
	MAIL_PROVIDER: "noop",
};

describe("envValidationSchema", () => {
	it.each([
		"cuentasclaras://",
		"cuentasclaras://app",
		"https://links.cuentasclaras.app",
	])("accepts APP_PUBLIC_URL value %s", (appPublicUrl) => {
		const result = envValidationSchema.validate({
			...validBaseEnv,
			APP_PUBLIC_URL: appPublicUrl,
		});

		expect(result.error).toBeUndefined();
		expect(result.value.APP_PUBLIC_URL).toBe(appPublicUrl);
	});

	it.each([
		"not a url",
		"cuentasclaras",
		"ftp://links.cuentasclaras.app",
	])("rejects invalid APP_PUBLIC_URL value %s", (appPublicUrl) => {
		const result = envValidationSchema.validate({
			...validBaseEnv,
			APP_PUBLIC_URL: appPublicUrl,
		});

		expect(result.error).toBeDefined();
	});
});
