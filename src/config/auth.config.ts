import { registerAs } from "@nestjs/config";

export type TtlString = `${number}${"s" | "m" | "h" | "d"}`;

export type AuthConfig = {
	jwtAccessSecret: string;
	jwtRefreshSecret: string;
	jwtAccessTtl: TtlString;
	jwtRefreshTtl: TtlString;
	googleClientId?: string;
};

export default registerAs(
	"auth",
	(): AuthConfig => ({
		jwtAccessSecret: process.env.JWT_ACCESS_SECRET!,
		jwtRefreshSecret: process.env.JWT_REFRESH_SECRET!,
		jwtAccessTtl: (process.env.JWT_ACCESS_TTL ?? "15m") as TtlString,
		jwtRefreshTtl: (process.env.JWT_REFRESH_TTL ?? "30d") as TtlString,
		googleClientId: process.env.GOOGLE_CLIENT_ID,
	}),
);
