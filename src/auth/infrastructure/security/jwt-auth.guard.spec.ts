import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../../../shared/decorators/public.decorator";
import { JwtAuthGuard } from "./jwt-auth.guard";

describe("JwtAuthGuard", () => {
	it("allows a public route without delegating to passport", () => {
		const reflector = new Reflector();
		const getAllAndOverride = vi
			.spyOn(reflector, "getAllAndOverride")
			.mockReturnValue(true);
		const guard = new JwtAuthGuard(reflector);

		expect(guard.canActivate(createContext())).toBe(true);
		expect(getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
			expect.any(Function),
			expect.any(Function),
		]);
	});

	it("delegates protected routes to the passport jwt guard", () => {
		const reflector = new Reflector();
		vi.spyOn(reflector, "getAllAndOverride").mockReturnValue(false);
		const guard = new JwtAuthGuard(reflector);
		const passportCanActivate = vi
			.spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), "canActivate")
			.mockReturnValue(true);

		expect(guard.canActivate(createContext())).toBe(true);
		expect(passportCanActivate).toHaveBeenCalledOnce();

		passportCanActivate.mockRestore();
	});
});

function createContext(): ExecutionContext {
	return {
		getHandler: () => function handler() {},
		getClass: () => function Controller() {},
	} as ExecutionContext;
}
