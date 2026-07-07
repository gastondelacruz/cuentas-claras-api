import type { NestExpressApplication } from "@nestjs/platform-express";

export const configureTrustProxy = (
	app: Pick<NestExpressApplication, "set">,
	trustProxyHops: number,
): void => {
	if (trustProxyHops > 0) {
		app.set("trust proxy", trustProxyHops);
	}
};
