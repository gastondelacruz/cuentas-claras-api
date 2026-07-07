import * as Joi from "joi";

export const envValidationSchema = Joi.object({
	NODE_ENV: Joi.string()
		.valid("development", "test", "production")
		.default("development"),
	PORT: Joi.number().port().default(3000),
	TRUST_PROXY_HOPS: Joi.number().integer().min(0).default(0),
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
	MAIL_PROVIDER: Joi.string().valid("noop", "resend").default("noop"),
	MAIL_FROM: Joi.string().default("Cuentas Claras <noreply@example.com>"),
	APP_PUBLIC_URL: Joi.alternatives()
		.try(
			Joi.string().uri({ scheme: ["http", "https"] }),
			Joi.string().pattern(/^cuentasclaras:\/\/(?:[A-Za-z0-9.-]+)?$/),
		)
		.default("http://localhost:3000"),
	EMAIL_VERIFICATION_TOKEN_TTL: Joi.string()
		.pattern(/^\d+[smhd]$/)
		.default("24h"),
	GROUP_INVITATION_TOKEN_TTL: Joi.string()
		.pattern(/^\d+[smhd]$/)
		.default("7d"),
	RESEND_API_KEY: Joi.when("MAIL_PROVIDER", {
		is: "resend",
		then: Joi.string().required(),
		otherwise: Joi.string().allow("").optional(),
	}),
	THROTTLE_DEFAULT_LIMIT: Joi.number().integer().positive().default(100),
	THROTTLE_DEFAULT_TTL: Joi.number().integer().positive().default(60_000),
	THROTTLE_AUTH_LIMIT: Joi.number().integer().positive().default(5),
	THROTTLE_AUTH_TTL: Joi.number().integer().positive().default(60_000),
});
