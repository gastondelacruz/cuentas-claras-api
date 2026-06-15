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

const DEV_USER_ID = "00000000-0000-0000-0000-000000000001";

describe("Group settlements endpoint (e2e)", () => {
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

	async function createGroupWithTwoMembers(): Promise<{
		groupId: string;
		gastonId: string;
		anaId: string;
	}> {
		const group = await prisma.group.create({
			data: {
				ownerUserId: DEV_USER_ID,
				name: "Trip to Bariloche",
				currency: "ARS",
			},
		});

		const gaston = await prisma.groupMember.create({
			data: {
				groupId: group.id,
				userId: DEV_USER_ID,
				displayName: "Gaston",
				email: "dev@cuentasclaras.local",
			},
		});

		const ana = await prisma.groupMember.create({
			data: {
				groupId: group.id,
				userId: null,
				displayName: "Ana",
				email: "ana@example.com",
			},
		});

		return { groupId: group.id, gastonId: gaston.id, anaId: ana.id };
	}

	it("GET /api/v1/groups/:groupId/settlements returns empty when balances are zero", async () => {
		const { groupId } = await createGroupWithTwoMembers();

		const response = await request(app.getHttpServer())
			.get(`/api/v1/groups/${groupId}/settlements`)
			.expect(200);

		expect(response.body).toEqual({ data: { settlements: [] } });
	});

	it("GET /api/v1/groups/:groupId/settlements returns correct suggestions for a group with expenses", async () => {
		const { groupId, gastonId, anaId } = await createGroupWithTwoMembers();

		const expense = await prisma.expense.create({
			data: {
				groupId,
				title: "Hotel",
				amount: "30000.00",
				currency: "ARS",
				paidByMemberId: gastonId,
				splitType: "EQUAL",
				expenseDate: new Date("2026-06-12T00:00:00.000Z"),
			},
		});

		await prisma.expenseSplit.createMany({
			data: [
				{
					expenseId: expense.id,
					memberId: gastonId,
					owedAmount: "15000.00",
					paidAmount: "30000.00",
					netAmount: "15000.00",
				},
				{
					expenseId: expense.id,
					memberId: anaId,
					owedAmount: "15000.00",
					paidAmount: "0.00",
					netAmount: "-15000.00",
				},
			],
		});

		const response = await request(app.getHttpServer())
			.get(`/api/v1/groups/${groupId}/settlements`)
			.expect(200);

		expect(response.body).toEqual({
			data: {
				settlements: [
					{
						fromMemberId: anaId,
						fromMemberName: "Ana",
						toMemberId: gastonId,
						toMemberName: "Gaston",
						amount: 15000,
						currency: "ARS",
					},
				],
			},
		});
	});

	it("GET /api/v1/groups/:groupId/settlements returns 404 when the group does not exist", async () => {
		await request(app.getHttpServer())
			.get("/api/v1/groups/11111111-1111-1111-1111-111111111111/settlements")
			.expect(404);
	});
});
