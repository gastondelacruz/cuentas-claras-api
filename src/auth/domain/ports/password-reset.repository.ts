export type PasswordResetTokenRecord = {
	id: string;
	userId: string;
	tokenDigest: string;
	expiresAt: Date;
	consumedAt: Date | null;
};

export type SavePasswordResetTokenInput = {
	userId: string;
	tokenDigest: string;
	expiresAt: Date;
};

export type ReplacePasswordResetTokenInput = {
	userId: string;
	tokenDigest: string;
	expiresAt: Date;
	invalidatedAt: Date;
};

export type CompletePasswordResetInput = {
	tokenId: string;
	userId: string;
	passwordHash: string;
	completedAt: Date;
};

export abstract class PasswordResetRepository {
	abstract save(input: SavePasswordResetTokenInput): Promise<void>;
	abstract invalidateActiveForUser(
		userId: string,
		invalidatedAt: Date,
	): Promise<void>;
	abstract replaceActiveForUser(
		input: ReplacePasswordResetTokenInput,
	): Promise<void>;
	abstract findByDigest(
		tokenDigest: string,
	): Promise<PasswordResetTokenRecord | null>;
	abstract complete(input: CompletePasswordResetInput): Promise<boolean>;
}
