import { BusinessException } from "../../../shared/exceptions/business.exception";
import { GoogleAuthLibraryTokenVerifier } from "./google-auth-library-token-verifier";

const googleAuthMocks = vi.hoisted(() => ({
	OAuth2Client: vi.fn(),
	verifyIdToken: vi.fn(),
}));

vi.mock("google-auth-library", () => ({
	OAuth2Client: googleAuthMocks.OAuth2Client,
}));

describe("GoogleAuthLibraryTokenVerifier", () => {
	beforeEach(() => {
		googleAuthMocks.OAuth2Client.mockReset();
		googleAuthMocks.verifyIdToken.mockReset();
		googleAuthMocks.OAuth2Client.mockImplementation(function OAuth2Client() {
			return {
				verifyIdToken: googleAuthMocks.verifyIdToken,
			};
		});
	});

	it("verifies the id token audience and returns normalized Google claims", async () => {
		googleAuthMocks.verifyIdToken.mockResolvedValue({
			getPayload: () => ({
				sub: "google-123",
				email: "jane@example.com",
				email_verified: true,
				name: "Jane",
				picture: "https://example.com/avatar.jpg",
			}),
		});
		const verifier = new GoogleAuthLibraryTokenVerifier({
			googleClientId: "google-client-id",
		});

		await expect(verifier.verifyIdToken("id-token")).resolves.toEqual({
			googleId: "google-123",
			email: "jane@example.com",
			emailVerified: true,
			name: "Jane",
			avatarUrl: "https://example.com/avatar.jpg",
		});
		expect(googleAuthMocks.OAuth2Client).toHaveBeenCalledWith(
			"google-client-id",
		);
		expect(googleAuthMocks.verifyIdToken).toHaveBeenCalledWith({
			idToken: "id-token",
			audience: "google-client-id",
		});
	});

	it("uses the email as a fallback name when Google does not provide a name", async () => {
		googleAuthMocks.verifyIdToken.mockResolvedValue({
			getPayload: () => ({
				sub: "google-123",
				email: "jane@example.com",
				email_verified: true,
			}),
		});
		const verifier = new GoogleAuthLibraryTokenVerifier({
			googleClientId: "google-client-id",
		});

		await expect(verifier.verifyIdToken("id-token")).resolves.toMatchObject({
			name: "jane@example.com",
			avatarUrl: null,
		});
	});

	it("returns a safe business exception when Google login is not configured", async () => {
		const verifier = new GoogleAuthLibraryTokenVerifier({
			googleClientId: undefined,
		});

		await expect(verifier.verifyIdToken("id-token")).rejects.toMatchObject({
			code: "GOOGLE_LOGIN_NOT_CONFIGURED",
			message: "Google login is not configured.",
			statusCode: 503,
			type: "business",
		});
		expect(googleAuthMocks.verifyIdToken).not.toHaveBeenCalled();
	});

	it("returns a safe business exception when Google rejects a malformed token", async () => {
		googleAuthMocks.verifyIdToken.mockRejectedValue(
			new Error("Wrong number of segments in token"),
		);
		const verifier = new GoogleAuthLibraryTokenVerifier({
			googleClientId: "google-client-id",
		});

		await expect(verifier.verifyIdToken("id-token")).rejects.toMatchObject({
			code: "INVALID_GOOGLE_TOKEN",
			message: "Invalid Google token.",
			statusCode: 401,
			type: "business",
		});
	});

	it("does not misclassify provider-shaped malformed token errors as outages", async () => {
		googleAuthMocks.verifyIdToken.mockRejectedValue({
			message: "Invalid token signature",
			response: { status: 401 },
		});
		const verifier = new GoogleAuthLibraryTokenVerifier({
			googleClientId: "google-client-id",
		});

		await expect(verifier.verifyIdToken("malformed-token")).rejects.toMatchObject({
			code: "INVALID_GOOGLE_TOKEN",
			statusCode: 401,
		});
	});

	it.each([
		{ code: "ETIMEDOUT", message: "request timed out" },
		{ code: "ECONNRESET", message: "socket hang up" },
		{ response: { status: 503 }, message: "upstream unavailable" },
	])("returns a safe unavailable error for provider availability failures", async (error) => {
		googleAuthMocks.verifyIdToken.mockRejectedValue(error);
		const verifier = new GoogleAuthLibraryTokenVerifier({
			googleClientId: "google-client-id",
		});

		await expect(verifier.verifyIdToken("id-token")).rejects.toMatchObject({
			code: "GOOGLE_LOGIN_UNAVAILABLE",
			message: "Google login is temporarily unavailable.",
			statusCode: 503,
			type: "business",
		});
	});

	it("returns a safe business exception when required claims are missing", async () => {
		googleAuthMocks.verifyIdToken.mockResolvedValue({
			getPayload: () => ({
				email: "jane@example.com",
				email_verified: true,
			}),
		});
		const verifier = new GoogleAuthLibraryTokenVerifier({
			googleClientId: "google-client-id",
		});

		await expect(verifier.verifyIdToken("id-token")).rejects.toBeInstanceOf(
			BusinessException,
		);
		await expect(verifier.verifyIdToken("id-token")).rejects.toMatchObject({
			code: "GOOGLE_TOKEN_MISSING_CLAIMS",
			message: "Google token is missing required claims.",
			statusCode: 401,
			type: "business",
		});
	});
});
