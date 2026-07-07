import { registerAs } from "@nestjs/config";

export const rateLimitDefaults = {
	default: {
		limit: 100,
		ttl: 60_000,
	},
	auth: {
		limit: 5,
		ttl: 60_000,
	},
};

const parsePositiveInteger = (
	value: string | undefined,
	fallback: number,
): number => {
	const parsed = Number(value);

	return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const getAuthRateLimitValues = () => ({
	limit: parsePositiveInteger(
		process.env.THROTTLE_AUTH_LIMIT,
		rateLimitDefaults.auth.limit,
	),
	ttl: parsePositiveInteger(
		process.env.THROTTLE_AUTH_TTL,
		rateLimitDefaults.auth.ttl,
	),
});

export const getAuthRateLimit = () => ({
	limit: () => getAuthRateLimitValues().limit,
	ttl: () => getAuthRateLimitValues().ttl,
});

export default registerAs("rateLimit", () => ({
	default: {
		limit: parsePositiveInteger(
			process.env.THROTTLE_DEFAULT_LIMIT,
			rateLimitDefaults.default.limit,
		),
		ttl: parsePositiveInteger(
			process.env.THROTTLE_DEFAULT_TTL,
			rateLimitDefaults.default.ttl,
		),
	},
	auth: getAuthRateLimitValues(),
}));
