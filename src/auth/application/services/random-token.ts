import { randomBytes } from "node:crypto";

export function createRandomToken(): string {
	return randomBytes(32).toString("base64url");
}
