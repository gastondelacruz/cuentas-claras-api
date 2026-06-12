import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const DEV_USER_ID = "00000000-0000-0000-0000-000000000001";
const DEV_USER_EMAIL = "dev@cuentasclaras.local";

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
	} finally {
		await prisma.$disconnect();
	}
}

void main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
