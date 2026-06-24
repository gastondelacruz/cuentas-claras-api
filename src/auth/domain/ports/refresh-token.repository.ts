export type SaveRefreshTokenInput = {
	userId: string;
	tokenHash: string;
	expiresAt: Date;
};

export type RefreshToken = {
	id: string;
	userId: string;
	tokenHash: string;
	expiresAt: Date;
	revokedAt: Date | null;
};

export abstract class RefreshTokenRepository {
	abstract save(input: SaveRefreshTokenInput): Promise<void>;
	abstract findActiveByUserId(userId: string): Promise<RefreshToken[]>;
	abstract revoke(id: string): Promise<void>;
	abstract revokeAllByUserId(userId: string): Promise<void>;
}
