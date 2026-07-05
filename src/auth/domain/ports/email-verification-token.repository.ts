export type EmailVerificationTokenRecord = {
	id: string;
	userId: string;
	tokenDigest: string;
	expiresAt: Date;
	consumedAt: Date | null;
};

export type SaveEmailVerificationTokenInput = {
	userId: string;
	tokenDigest: string;
	expiresAt: Date;
};

export abstract class EmailVerificationTokenRepository {
	abstract save(input: SaveEmailVerificationTokenInput): Promise<void>;
	abstract invalidateActiveForUser(userId: string, invalidatedAt: Date): Promise<void>;
	abstract findByDigest(tokenDigest: string): Promise<EmailVerificationTokenRecord | null>;
	abstract consume(id: string, consumedAt: Date): Promise<boolean>;
}
