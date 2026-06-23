import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Test, type TestingModule } from "@nestjs/testing";
import {
	PostgreSqlContainer,
	type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { HttpExceptionFilter } from "../src/shared/filters/http-exception.filter";
import { ResponseInterceptor } from "../src/shared/interceptors/response.interceptor";
import {
	configureDefaultBearerAuth,
	createBearerToken,
} from "./helpers/auth.helper";

const DEV_USER_ID = "00000000-0000-0000-0000-000000000001";
const DEV_USER_EMAIL = "dev@cuentasclaras.local";

describe("Me summary endpoint (e2e)", () => {
	let app: INestApplication;
	let postgresContainer: StartedPostgreSqlContainer;
	let prisma: PrismaClient;

	beforeAll(async () => {
		postgresContainer = await new PostgreSqlContainer("postgres:17-alpine")
			.withDatabase("cuentas_claras_test")
			.withUsername("postgres")
			.withPassword("postgres")
			.start();

		process.env.DATABASE_URL = postgresContainer.getConnectionUri();
		process.env.NODE_ENV = "test";
		process.env.JWT_ACCESS_SECRET = "test-access-secret-with-at-least-32-chars";
		process.env.JWT_REFRESH_SECRET =
			"test-refresh-secret-with-at-least-32-chars";
		process.env.JWT_ACCESS_TTL = "15m";
		process.env.JWT_REFRESH_TTL = "30d";

		execSync("npx prisma db push", {
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

		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();

		app = moduleFixture.createNestApplication();
		app.useGlobalPipes(
			new ValidationPipe({
				whitelist: true,
				transform: true,
			}),
		);
		app.useGlobalFilters(new HttpExceptionFilter());
		app.useGlobalInterceptors(new ResponseInterceptor());
		configureDefaultBearerAuth(
			app,
			createBearerToken({ userId: DEV_USER_ID, email: DEV_USER_EMAIL }),
		);

		await app.init();
	});

	afterAll(async () => {
		if (app) {
			await app.close();
		}

		if (prisma) {
			await prisma.$disconnect();
		}

		if (postgresContainer) {
			await postgresContainer.stop();
		}
	});

	beforeEach(async () => {
		await prisma.expenseSplit.deleteMany();
		await prisma.expense.deleteMany();
		await prisma.settlementPayment.deleteMany();
		await prisma.groupMember.deleteMany();
		await prisma.group.deleteMany();
		await prisma.user.deleteMany({
			where: {
				id: {
					not: DEV_USER_ID,
				},
			},
		});
	});

	it("GET /api/v1/me/summary derives totals from active groups and active memberships", async () => {
		const { groupId: firstGroupId, devMemberId: firstDevMemberId } =
			await createGroupWithDevMember({
				name: "Trip to Bariloche",
				memberCreatedAt: new Date("2026-01-05T00:00:00.000Z"),
			});
		const firstAnaMember = await createInvitedMember(firstGroupId, "Ana");
		await createExpenseWithSplits({
			groupId: firstGroupId,
			paidByMemberId: firstDevMemberId,
			amount: "100000.00",
			splits: [
				{ memberId: firstDevMemberId, netAmount: "50000.00" },
				{ memberId: firstAnaMember.id, netAmount: "-50000.00" },
			],
		});
		await prisma.settlementPayment.create({
			data: {
				groupId: firstGroupId,
				fromMemberId: firstAnaMember.id,
				toMemberId: firstDevMemberId,
				amount: "10000.00",
				currency: "ARS",
				paidAt: new Date("2026-06-10T00:00:00.000Z"),
			},
		});

		const { groupId: secondGroupId, devMemberId: secondDevMemberId } =
			await createGroupWithDevMember({
				name: "Home",
				memberCreatedAt: new Date("2026-02-01T00:00:00.000Z"),
			});
		const secondAnaMember = await createInvitedMember(secondGroupId, "Luis");
		await createExpenseWithSplits({
			groupId: secondGroupId,
			paidByMemberId: secondAnaMember.id,
			amount: "50000.00",
			splits: [
				{ memberId: secondDevMemberId, netAmount: "-25000.00" },
				{ memberId: secondAnaMember.id, netAmount: "25000.00" },
			],
		});

		await createExcludedArchivedGroup();
		await createDeletedExpense(firstGroupId, firstDevMemberId, firstAnaMember.id);

		const response = await request(app.getHttpServer())
			.get("/api/v1/me/summary")
			.expect(200);

		expect(response.body).toEqual({
			data: {
				totalGroups: 2,
				totalExpenses: 2,
				totalsByCurrency: [
					{
						currency: "ARS",
						totalPaid: 100000,
						totalOwed: 0,
						totalToReceive: 15000,
					},
				],
				activeSince: "2026-01-05T00:00:00.000Z",
			},
		});
	});

	it("GET /api/v1/me/summary groups monetary totals by currency without summing mixed currencies", async () => {
		const { groupId: arsGroupId, devMemberId: arsDevMemberId } =
			await createGroupWithDevMember({
				name: "ARS group",
				currency: "ARS",
				memberCreatedAt: new Date("2026-01-05T00:00:00.000Z"),
			});
		const arsOtherMember = await createInvitedMember(arsGroupId, "Ana");
		await createExpenseWithSplits({
			groupId: arsGroupId,
			paidByMemberId: arsDevMemberId,
			amount: "120000.00",
			currency: "ARS",
			splits: [
				{ memberId: arsDevMemberId, netAmount: "60000.00" },
				{ memberId: arsOtherMember.id, netAmount: "-60000.00" },
			],
		});

		const { groupId: usdGroupId, devMemberId: usdDevMemberId } =
			await createGroupWithDevMember({
				name: "USD group",
				currency: "USD",
				memberCreatedAt: new Date("2026-02-01T00:00:00.000Z"),
			});
		const usdOtherMember = await createInvitedMember(usdGroupId, "Luis");
		await createExpenseWithSplits({
			groupId: usdGroupId,
			paidByMemberId: usdOtherMember.id,
			amount: "200.00",
			currency: "USD",
			splits: [
				{ memberId: usdDevMemberId, netAmount: "-100.00" },
				{ memberId: usdOtherMember.id, netAmount: "100.00" },
			],
		});

		const response = await request(app.getHttpServer())
			.get("/api/v1/me/summary")
			.expect(200);

		expect(response.body).toEqual({
			data: {
				totalGroups: 2,
				totalExpenses: 2,
				totalsByCurrency: [
					{
						currency: "ARS",
						totalPaid: 120000,
						totalOwed: 0,
						totalToReceive: 60000,
					},
					{
						currency: "USD",
						totalPaid: 0,
						totalOwed: 100,
						totalToReceive: 0,
					},
				],
				activeSince: "2026-01-05T00:00:00.000Z",
			},
		});
	});

	it("GET /api/v1/me/summary returns empty deterministic totals when the dev user has no active groups", async () => {
		const response = await request(app.getHttpServer())
			.get("/api/v1/me/summary")
			.expect(200);

		expect(response.body).toEqual({
			data: {
				totalGroups: 0,
				totalExpenses: 0,
				totalsByCurrency: [],
				activeSince: null,
			},
		});
	});

	it("GET /api/v1/me/summary excludes deleted settlements from totals", async () => {
		const { groupId, devMemberId } = await createGroupWithDevMember({
			name: "Deleted settlements",
			memberCreatedAt: new Date("2026-03-01T00:00:00.000Z"),
		});
		const otherMember = await createInvitedMember(groupId, "Ana");

		await createExpenseWithSplits({
			groupId,
			paidByMemberId: devMemberId,
			amount: "100000.00",
			splits: [
				{ memberId: devMemberId, netAmount: "50000.00" },
				{ memberId: otherMember.id, netAmount: "-50000.00" },
			],
		});

		await prisma.settlementPayment.create({
			data: {
				groupId,
				fromMemberId: otherMember.id,
				toMemberId: devMemberId,
				amount: "10000.00",
				currency: "ARS",
				paidAt: new Date("2026-06-10T00:00:00.000Z"),
				deletedAt: new Date("2026-06-11T00:00:00.000Z"),
			},
		});

		const response = await request(app.getHttpServer())
			.get("/api/v1/me/summary")
			.expect(200);

		expect(response.body).toEqual({
			data: {
				totalGroups: 1,
				totalExpenses: 1,
				totalsByCurrency: [
					{
						currency: "ARS",
						totalPaid: 100000,
						totalOwed: 0,
						totalToReceive: 50000,
					},
				],
				activeSince: "2026-03-01T00:00:00.000Z",
			},
		});
	});

	it("GET /api/v1/me/summary excludes groups where the dev membership was removed", async () => {
		const { groupId, devMemberId } = await createGroupWithDevMember({
			name: "Removed membership",
			memberCreatedAt: new Date("2026-04-01T00:00:00.000Z"),
			removedAt: new Date("2026-04-15T00:00:00.000Z"),
		});
		const otherMember = await createInvitedMember(groupId, "Luis");

		await createExpenseWithSplits({
			groupId,
			paidByMemberId: devMemberId,
			amount: "100000.00",
			splits: [
				{ memberId: devMemberId, netAmount: "50000.00" },
				{ memberId: otherMember.id, netAmount: "-50000.00" },
			],
		});

		await prisma.settlementPayment.create({
			data: {
				groupId,
				fromMemberId: otherMember.id,
				toMemberId: devMemberId,
				amount: "10000.00",
				currency: "ARS",
				paidAt: new Date("2026-06-10T00:00:00.000Z"),
			},
		});

		const response = await request(app.getHttpServer())
			.get("/api/v1/me/summary")
			.expect(200);

		expect(response.body).toEqual({
			data: {
				totalGroups: 0,
				totalExpenses: 0,
				totalsByCurrency: [],
				activeSince: null,
			},
		});
	});

	async function createGroupWithDevMember(input: {
		name: string;
		currency?: string;
		memberCreatedAt: Date;
		removedAt?: Date;
	}): Promise<{ groupId: string; devMemberId: string }> {
		const group = await prisma.group.create({
			data: {
				ownerUserId: DEV_USER_ID,
				name: input.name,
				currency: input.currency ?? "ARS",
			},
		});

		const member = await prisma.groupMember.create({
			data: {
				groupId: group.id,
				userId: DEV_USER_ID,
				displayName: "Gaston",
				email: "dev@cuentasclaras.local",
				createdAt: input.memberCreatedAt,
				removedAt: input.removedAt ?? null,
			},
		});

		return { groupId: group.id, devMemberId: member.id };
	}

	async function createInvitedMember(groupId: string, displayName: string) {
		return prisma.groupMember.create({
			data: {
				groupId,
				userId: null,
				displayName,
			},
		});
	}

	async function createExpenseWithSplits(input: {
		groupId: string;
		paidByMemberId: string;
		amount: string;
		currency?: string;
		splits: Array<{ memberId: string; netAmount: string }>;
		deletedAt?: Date;
	}): Promise<void> {
		const expense = await prisma.expense.create({
			data: {
				groupId: input.groupId,
				title: "Shared expense",
				amount: input.amount,
				currency: input.currency ?? "ARS",
				paidByMemberId: input.paidByMemberId,
				splitType: "EQUAL",
				expenseDate: new Date("2026-06-01T00:00:00.000Z"),
				deletedAt: input.deletedAt ?? null,
			},
		});

		await prisma.expenseSplit.createMany({
			data: input.splits.map((split) => ({
				expenseId: expense.id,
				memberId: split.memberId,
				owedAmount: "0.00",
				paidAmount: "0.00",
				netAmount: split.netAmount,
			})),
		});
	}

	async function createDeletedExpense(
		groupId: string,
		devMemberId: string,
		otherMemberId: string,
	): Promise<void> {
		await createExpenseWithSplits({
			groupId,
			paidByMemberId: devMemberId,
			amount: "999999.00",
			deletedAt: new Date("2026-06-11T00:00:00.000Z"),
			splits: [
				{ memberId: devMemberId, netAmount: "999999.00" },
				{ memberId: otherMemberId, netAmount: "-999999.00" },
			],
		});
	}

	async function createExcludedArchivedGroup(): Promise<void> {
		const group = await prisma.group.create({
			data: {
				ownerUserId: DEV_USER_ID,
				name: "Archived",
				currency: "ARS",
				archivedAt: new Date("2026-06-12T00:00:00.000Z"),
			},
		});

		const archivedDevMember = await prisma.groupMember.create({
			data: {
				groupId: group.id,
				userId: DEV_USER_ID,
				displayName: "Gaston",
			},
		});

		const otherMember = await prisma.groupMember.create({
			data: {
				groupId: group.id,
				userId: null,
				displayName: "Archived member",
			},
		});

		await createExpenseWithSplits({
			groupId: group.id,
			paidByMemberId: archivedDevMember.id,
			amount: "777777.00",
			splits: [
				{ memberId: archivedDevMember.id, netAmount: "388888.50" },
				{ memberId: otherMember.id, netAmount: "388888.50" },
			],
		});

		await prisma.settlementPayment.create({
			data: {
				groupId: group.id,
				fromMemberId: archivedDevMember.id,
				toMemberId: otherMember.id,
				amount: "123456.00",
				currency: "ARS",
				paidAt: new Date("2026-06-12T00:00:00.000Z"),
			},
		});
	}
});
