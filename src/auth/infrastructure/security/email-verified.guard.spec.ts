import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ALLOW_UNVERIFIED_KEY } from "../../../shared/decorators/allow-unverified.decorator";
import { IS_PUBLIC_KEY } from "../../../shared/decorators/public.decorator";
import type { JwtRequestUser } from "./jwt.strategy";
import { EmailVerifiedGuard } from "./email-verified.guard";

describe("EmailVerifiedGuard", () => {
	it("rejects a token signed without verified-email authority after the user becomes verified", async () => {
		const guard = createGuard();

		await expect(
			guard.canActivate(createContext({
				userId: "user-1",
				email: "jane@example.com",
				emailVerified: false,
			})),
		).rejects.toMatchObject({
			code: "EMAIL_NOT_VERIFIED",
			statusCode: 403,
		});
	});

	it("rejects a token without a signed verified-email claim", async () => {
		const guard = createGuard();

		await expect(
			guard.canActivate(createContext({
				userId: "user-1",
				email: "jane@example.com",
			})),
		).rejects.toMatchObject({
			code: "EMAIL_NOT_VERIFIED",
			statusCode: 403,
		});
	});

	it("allows a token signed with verified-email authority", async () => {
		const guard = createGuard();

		await expect(
			guard.canActivate(createContext({
				userId: "user-1",
				email: "jane@example.com",
				emailVerified: true,
			})),
		).resolves.toBe(true);
	});

	it("allows public routes without verified-email authority", async () => {
		const guard = createGuard({ isPublic: true });

		await expect(guard.canActivate(createContext())).resolves.toBe(true);
	});

	it("allows explicitly unverified routes without verified-email authority", async () => {
		const guard = createGuard({ allowUnverified: true });

		await expect(
			guard.canActivate(createContext({
				userId: "user-1",
				email: "jane@example.com",
				emailVerified: false,
			})),
		).resolves.toBe(true);
	});

	it("allows a missing request user so the authentication guard remains authoritative", async () => {
		const guard = createGuard();

		await expect(guard.canActivate(createContext())).resolves.toBe(true);
	});
});

function createGuard(metadata: { isPublic?: boolean; allowUnverified?: boolean } = {}) {
	const reflector = new Reflector();
	vi.spyOn(reflector, "getAllAndOverride").mockImplementation((key: unknown) => {
		if (key === IS_PUBLIC_KEY) {
			return metadata.isPublic ?? false;
		}

		if (key === ALLOW_UNVERIFIED_KEY) {
			return metadata.allowUnverified ?? false;
		}

		return undefined;
	});
	return new EmailVerifiedGuard(reflector);
}

function createContext(user?: JwtRequestUser): ExecutionContext {
	return {
		getHandler: () => function handler() {},
		getClass: () => function Controller() {},
		switchToHttp: () => ({
			getRequest: () => ({ user }),
		}),
	} as unknown as ExecutionContext;
}
