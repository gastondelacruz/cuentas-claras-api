export type AccessTokenPayload = {
	sub: string;
	email: string;
};

export type RefreshTokenPayload = {
	sub: string;
};

export type SignedRefreshToken = {
	token: string;
	expiresAt: Date;
};

export abstract class TokenService {
	abstract signAccessToken(payload: AccessTokenPayload): Promise<string>;
	abstract signRefreshToken(
		payload: RefreshTokenPayload,
	): Promise<SignedRefreshToken>;
	abstract verifyRefreshToken(token: string): Promise<RefreshTokenPayload>;
}
