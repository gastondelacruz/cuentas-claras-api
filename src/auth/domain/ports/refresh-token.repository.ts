export type SaveRefreshTokenInput = {
	userId: string;
	tokenHash: string;
	expiresAt: Date;
};

export abstract class RefreshTokenRepository {
	abstract save(input: SaveRefreshTokenInput): Promise<void>;
}
