import type { TtlString } from "../../../config/auth.config";

export function ttlToDate(ttl: TtlString, now = new Date()): Date {
	const value = Number(ttl.slice(0, -1));
	const unit = ttl.slice(-1);
	const multipliers: Record<string, number> = {
		s: 1_000,
		m: 60_000,
		h: 3_600_000,
		d: 86_400_000,
	};

	return new Date(now.getTime() + value * multipliers[unit]);
}
