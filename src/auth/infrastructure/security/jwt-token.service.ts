import { Inject, Injectable } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { randomUUID } from "node:crypto";
import authConfig from "../../../config/auth.config";
import { BusinessException } from "../../../shared/exceptions/business.exception";
import {
	type AccessTokenPayload,
	type RefreshTokenPayload,
	type SignedRefreshToken,
	TokenService,
} from "../../domain/ports/token.service";

@Injectable()
export class JwtTokenService extends TokenService {
	constructor(
		private readonly jwtService: JwtService,
		@Inject(authConfig.KEY)
		private readonly config: ConfigType<typeof authConfig>,
	) {
		super();
	}

	signAccessToken(payload: AccessTokenPayload): Promise<string> {
		return this.jwtService.signAsync(payload, {
			secret: this.config.jwtAccessSecret,
			expiresIn: this.config.jwtAccessTtl,
		});
	}

	async signRefreshToken(
		payload: RefreshTokenPayload,
	): Promise<SignedRefreshToken> {
		const token = await this.jwtService.signAsync({ ...payload, jti: randomUUID() }, {
			secret: this.config.jwtRefreshSecret,
			expiresIn: this.config.jwtRefreshTtl,
		});

		return {
			token,
			expiresAt: addTtlToDate(new Date(), this.config.jwtRefreshTtl),
		};
	}

	async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
		try {
			return await this.jwtService.verifyAsync<RefreshTokenPayload>(token, {
				secret: this.config.jwtRefreshSecret,
			});
		} catch {
			throw new BusinessException(
				"INVALID_REFRESH_TOKEN",
				"Invalid or expired refresh token.",
				401,
			);
		}
	}
}

function addTtlToDate(date: Date, ttl: string): Date {
	const match = /^(\d+)([smhd])$/.exec(ttl);

	if (!match) {
		throw new Error(`Invalid TTL format: ${ttl}`);
	}

	const amount = Number(match[1]);
	const unit = match[2];
	const multipliers: Record<string, number> = {
		s: 1000,
		m: 60 * 1000,
		h: 60 * 60 * 1000,
		d: 24 * 60 * 60 * 1000,
	};

	return new Date(date.getTime() + amount * multipliers[unit]);
}
