import { Injectable } from "@nestjs/common";
import * as argon2 from "argon2";
import { PasswordHasher } from "../../domain/ports/password-hasher";

@Injectable()
export class Argon2PasswordHasher extends PasswordHasher {
	hash(plain: string): Promise<string> {
		return argon2.hash(plain);
	}

	async verify(plain: string, hashed: string): Promise<boolean> {
		try {
			return await argon2.verify(hashed, plain);
		} catch {
			return false;
		}
	}
}
