export type GoogleTokenClaims = {
	googleId: string;
	email: string;
	emailVerified: boolean;
	name: string;
	avatarUrl: string | null;
};

export abstract class GoogleTokenVerifier {
	abstract verifyIdToken(idToken: string): Promise<GoogleTokenClaims>;
}
