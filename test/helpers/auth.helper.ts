import { type INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { type NextFunction, type Request, type Response } from "express";
import request from "supertest";

export type AuthSession = {
	accessToken: string;
	userId: string;
	authorization: string;
};

export async function registerAndLogin(
	app: INestApplication,
): Promise<AuthSession> {
	const unique = crypto.randomUUID();
	const email = `user-${unique}@example.com`;
	const password = "SecureP4ss!";

	const registerResponse = await request(app.getHttpServer())
		.post("/api/v1/auth/register")
		.send({ email, password, name: "Test User" })
		.expect(201);

	const loginResponse = await request(app.getHttpServer())
		.post("/api/v1/auth/login")
		.send({ email, password })
		.expect(200);

	return {
		accessToken: loginResponse.body.data.accessToken,
		userId: registerResponse.body.data.user.id,
		authorization: `Bearer ${loginResponse.body.data.accessToken}`,
	};
}

export function createBearerToken(input: {
	userId: string;
	email: string;
}): string {
	const jwt = new JwtService({
		secret: process.env.JWT_ACCESS_SECRET,
		signOptions: { expiresIn: process.env.JWT_ACCESS_TTL ?? "15m" },
	});
	const accessToken = jwt.sign({ sub: input.userId, email: input.email });

	return `Bearer ${accessToken}`;
}

export function createExpiredBearerToken(input: {
	userId: string;
	email: string;
}): string {
	const jwt = new JwtService({
		secret: process.env.JWT_ACCESS_SECRET,
		signOptions: { expiresIn: "-1s" },
	});
	const accessToken = jwt.sign({ sub: input.userId, email: input.email });

	return `Bearer ${accessToken}`;
}

export function configureDefaultBearerAuth(
	app: INestApplication,
	authorization: string,
): void {
	app.use((request: Request, _response: Response, next: NextFunction) => {
		if (!request.headers.authorization && !request.headers["x-skip-test-auth"]) {
			request.headers.authorization = authorization;
		}

		next();
	});
}
