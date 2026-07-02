import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const DEV_USER_ID = "00000000-0000-0000-0000-000000000001";
const DEV_USER_EMAIL = "dev@cuentasclaras.local";
const DEV_DEFAULT_ACCOUNT_ID = "00000000-0000-0000-0000-000000000002";

async function main() {
	if (!process.env.DATABASE_URL) {
		throw new Error("DATABASE_URL is required to seed the database.");
	}

	const adapter = new PrismaPg({
		connectionString: process.env.DATABASE_URL,
	});
	const prisma = new PrismaClient({ adapter });

	try {
		await prisma.user.upsert({
			where: {
				id: DEV_USER_ID,
			},
			update: {
				name: "Development User",
				email: DEV_USER_EMAIL,
				avatarUrl: null,
			},
			create: {
				id: DEV_USER_ID,
				name: "Development User",
				email: DEV_USER_EMAIL,
				avatarUrl: null,
			},
		});

		await prisma.account.upsert({
			where: {
				id: DEV_DEFAULT_ACCOUNT_ID,
			},
			update: {},
			create: {
				id: DEV_DEFAULT_ACCOUNT_ID,
				userId: DEV_USER_ID,
				name: "Cuenta principal",
				kind: "BANK",
				currency: "ARS",
				isDefault: true,
			},
		});
	} finally {
		await prisma.$disconnect();
	}
}

void main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
