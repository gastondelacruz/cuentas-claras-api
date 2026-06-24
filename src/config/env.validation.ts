import * as Joi from "joi";

export const envValidationSchema = Joi.object({
	NODE_ENV: Joi.string()
		.valid("development", "test", "production")
		.default("development"),
	PORT: Joi.number().port().default(3000),
	DATABASE_URL: Joi.string()
		.uri({ scheme: ["postgresql", "postgres"] })
		.required(),
	JWT_ACCESS_SECRET: Joi.when("NODE_ENV", {
		is: "test",
		then: Joi.string()
			.min(32)
			.default("test-access-secret-with-at-least-32-chars"),
		otherwise: Joi.string().min(32).required(),
	}),
	JWT_REFRESH_SECRET: Joi.when("NODE_ENV", {
		is: "test",
		then: Joi.string()
			.min(32)
			.default("test-refresh-secret-with-at-least-32-chars"),
		otherwise: Joi.string().min(32).required(),
	}),
	JWT_ACCESS_TTL: Joi.string()
		.pattern(/^\d+[smhd]$/)
		.default("15m"),
	JWT_REFRESH_TTL: Joi.string()
		.pattern(/^\d+[smhd]$/)
		.default("30d"),
	GOOGLE_CLIENT_ID: Joi.string().allow("").optional(),
	REFRESH_TOKEN_DIGEST_SECRET: Joi.when("NODE_ENV", {
		is: "test",
		then: Joi.string()
			.min(32)
			.default("test-digest-secret-with-at-least-32-chars"),
		otherwise: Joi.string().min(32).required(),
	}),
});
