import { Inject, Injectable } from "@nestjs/common";
import { type ConfigType } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import authConfig from "../../../config/auth.config";

export type JwtPayload = {
	sub: string;
	email: string;
};

export type JwtRequestUser = {
	userId: string;
	email: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
	constructor(
		@Inject(authConfig.KEY)
		private readonly config: ConfigType<typeof authConfig>,
	) {
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			ignoreExpiration: false,
			secretOrKey: config.jwtAccessSecret,
		});
	}

	validate(payload: JwtPayload): JwtRequestUser {
		return {
			userId: payload.sub,
			email: payload.email,
		};
	}
}
