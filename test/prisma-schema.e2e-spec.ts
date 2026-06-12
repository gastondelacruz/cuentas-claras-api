import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, SplitType } from "@prisma/client";
import {
	PostgreSqlContainer,
	type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { execSync } from "node:child_process";

describe("Prisma initial database structure (e2e)", () => {
	let postgresContainer: StartedPostgreSqlContainer;
	let prisma: PrismaClient;

	beforeAll(async () => {
		postgresContainer = await new PostgreSqlContainer("postgres:17-alpine")
			.withDatabase("cuentas_claras_test")
			.withUsername("postgres")
			.withPassword("postgres")
			.start();

		process.env.DATABASE_URL = postgresContainer.getConnectionUri();

		execSync("npx prisma migrate deploy", {
			cwd: process.cwd(),
			env: process.env,
			stdio: "inherit",
		});

		execSync("npx prisma db seed", {
			cwd: process.cwd(),
			env: process.env,
			stdio: "inherit",
		});

		const adapter = new PrismaPg({
			connectionString: process.env.DATABASE_URL,
		});
		prisma = new PrismaClient({ adapter });
		await prisma.$connect();
	});

	afterAll(async () => {
		if (prisma) {
			await prisma.$disconnect();
		}

		if (postgresContainer) {
			await postgresContainer.stop();
		}
	});

	it("creates the required tables and seeds the stable development user", async () => {
		const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
			SELECT table_name
			FROM information_schema.tables
			WHERE table_schema = 'public'
				AND table_name IN (
					'users',
					'groups',
					'group_members',
					'expenses',
					'expense_splits',
					'settlement_payments'
				)
		`;

		expect(tables.map((table) => table.table_name).sort()).toEqual([
			"expense_splits",
			"expenses",
			"group_members",
			"groups",
			"settlement_payments",
			"users",
		]);

		const devUser = await prisma.user.findUniqueOrThrow({
			where: {
				email: "dev@cuentasclaras.local",
			},
		});

		expect(devUser.id).toBe("00000000-0000-0000-0000-000000000001");
		expect(devUser.name).toBe("Development User");
	});

	it("persists lowercase split_type values while exposing Prisma enum values", async () => {
		const group = await prisma.group.create({
			data: {
				ownerUserId: "00000000-0000-0000-0000-000000000001",
				name: "Summer Trip",
				description: "Friends vacation",
				currency: "USD",
			},
		});

		const member = await prisma.groupMember.create({
			data: {
				groupId: group.id,
				userId: "00000000-0000-0000-0000-000000000001",
				displayName: "Development User",
				email: "dev@cuentasclaras.local",
			},
		});

		const expense = await prisma.expense.create({
			data: {
				groupId: group.id,
				title: "Dinner",
				amount: "42.50",
				currency: "USD",
				paidByMemberId: member.id,
				splitType: SplitType.EQUAL,
				expenseDate: new Date("2026-06-12T00:00:00.000Z"),
			},
		});

		expect(expense.splitType).toBe(SplitType.EQUAL);

		const rows = await prisma.$queryRaw<Array<{ split_type: string }>>`
			SELECT split_type
			FROM expenses
			WHERE id = ${expense.id}::uuid
		`;

		expect(rows).toEqual([{ split_type: "equal" }]);
	});
});
