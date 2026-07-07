import { registerAs } from "@nestjs/config";

export default registerAs("app", () => ({
	nodeEnv: process.env.NODE_ENV ?? "development",
	port: Number(process.env.PORT ?? 3000),
	trustProxyHops: Number(process.env.TRUST_PROXY_HOPS ?? 0),
	databaseUrl: process.env.DATABASE_URL,
}));
