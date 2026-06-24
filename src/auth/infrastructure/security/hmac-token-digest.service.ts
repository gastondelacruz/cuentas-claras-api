import { Inject, Injectable } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { createHmac } from "node:crypto";
import authConfig from "../../../config/auth.config";
import { TokenDigestService } from "../../domain/ports/token-digest.service";

@Injectable()
export class HmacTokenDigestService extends TokenDigestService {
	constructor(
		@Inject(authConfig.KEY)
		private readonly config: Pick<ConfigType<typeof authConfig>, "refreshTokenDigestSecret">,
	) {
		super();
	}

	digest(rawToken: string): string {
		return createHmac("sha256", this.config.refreshTokenDigestSecret)
			.update(rawToken)
			.digest("hex");
	}
}
