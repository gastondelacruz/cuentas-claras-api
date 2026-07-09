import type { DefaultAccountInput } from "../../domain/ports/auth-user.repository";

export function createDefaultAccountInput(): DefaultAccountInput {
	return {
		name: "Cuenta principal",
		currency: "ARS",
		kind: "cash",
	};
}
