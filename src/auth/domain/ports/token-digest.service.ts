export abstract class TokenDigestService {
	/**
	 * Computes a deterministic, secret-keyed digest for the given raw token.
	 * The returned value is suitable for unique-index lookups (O(1) revocation).
	 */
	abstract digest(rawToken: string): string;
}
