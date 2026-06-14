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
const MISSING_GROUP_ID = "99999999-9999-4999-8999-999999999999";
const MISSING_MEMBER_ID = "88888888-8888-4888-8888-888888888888";

describe("Expenses endpoints (e2e)", () => {
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

	async function createGroupWithMembers(displayNames: string[]) {
		const group = await prisma.group.create({
			data: {
				ownerUserId: DEV_USER_ID,
				name: "Trip to Bariloche",
				currency: "ARS",
			},
		});

		const members = [];
		for (const displayName of displayNames) {
			const member = await prisma.groupMember.create({
				data: {
					groupId: group.id,
					userId: null,
					displayName,
				},
			});
			members.push(member);
		}

		return { group, members };
	}

	it("POST creates an expense with an equal split and persists the splits", async () => {
		const { group, members } = await createGroupWithMembers(["Gaston", "Ana"]);
		const [gaston, ana] = members;

		const response = await request(app.getHttpServer())
			.post(`/api/v1/groups/${group.id}/expenses`)
			.send({
				title: "Dinner",
				amount: 30000,
				currency: "ARS",
				paidByMemberId: gaston.id,
				participantMemberIds: [gaston.id, ana.id],
				splitType: "equal",
				category: "food",
				notes: "Pizza night",
				expenseDate: "2026-06-13T20:00:00.000Z",
			})
			.expect(201);

		expect(response.body).toEqual({
			data: {
				id: expect.any(String),
				groupId: group.id,
				title: "Dinner",
				amount: 30000,
				currency: "ARS",
				paidBy: {
					id: gaston.id,
					displayName: "Gaston",
				},
				participants: [
					{
						memberId: gaston.id,
						displayName: "Gaston",
						owedAmount: 15000,
						paidAmount: 30000,
						netAmount: 15000,
					},
					{
						memberId: ana.id,
						displayName: "Ana",
						owedAmount: 15000,
						paidAmount: 0,
						netAmount: -15000,
					},
				],
				splitType: "equal",
				category: "food",
				notes: "Pizza night",
				expenseDate: "2026-06-13T20:00:00.000Z",
				createdAt: expect.any(String),
				updatedAt: expect.any(String),
			},
		});

		const persistedExpense = await prisma.expense.findUniqueOrThrow({
			where: {
				id: response.body.data.id,
			},
			include: {
				expenseSplits: true,
			},
		});

		expect(persistedExpense.groupId).toBe(group.id);
		expect(persistedExpense.splitType).toBe("EQUAL");
		expect(Number(persistedExpense.amount)).toBe(30000);
		expect(persistedExpense.expenseSplits).toHaveLength(2);
	});

	it("POST distributes remainder cents so the split stays exact", async () => {
		const { group, members } = await createGroupWithMembers(["A", "B", "C"]);
		const [a, b, c] = members;

		const response = await request(app.getHttpServer())
			.post(`/api/v1/groups/${group.id}/expenses`)
			.send({
				title: "Coffee",
				amount: 100,
				currency: "ARS",
				paidByMemberId: a.id,
				participantMemberIds: [a.id, b.id, c.id],
				splitType: "equal",
				expenseDate: "2026-06-13T20:00:00.000Z",
			})
			.expect(201);

		const owed = response.body.data.participants.map(
			(participant: { owedAmount: number }) => participant.owedAmount,
		);

		expect(owed).toEqual([33.34, 33.33, 33.33]);
		expect(owed.reduce((total: number, value: number) => total + value, 0)).toBeCloseTo(
			100,
			2,
		);
	});

	it("POST returns 400 for invalid payloads", async () => {
		const { group, members } = await createGroupWithMembers(["Gaston", "Ana"]);
		const [gaston, ana] = members;

		const validBody = {
			title: "Dinner",
			amount: 30000,
			currency: "ARS",
			paidByMemberId: gaston.id,
			participantMemberIds: [gaston.id, ana.id],
			splitType: "equal",
			expenseDate: "2026-06-13T20:00:00.000Z",
		};

		for (const override of [
			{ title: undefined },
			{ amount: 0 },
			{ amount: -10 },
			{ currency: "ars" },
			{ paidByMemberId: "not-a-uuid" },
			{ participantMemberIds: [] },
			{ splitType: "custom" },
			{ expenseDate: "not-a-date" },
		]) {
			await request(app.getHttpServer())
				.post(`/api/v1/groups/${group.id}/expenses`)
				.send({ ...validBody, ...override })
				.expect(400);
		}
	});

	it("POST returns 404 when the group does not exist", async () => {
		const response = await request(app.getHttpServer())
			.post(`/api/v1/groups/${MISSING_GROUP_ID}/expenses`)
			.send({
				title: "Dinner",
				amount: 30000,
				currency: "ARS",
				paidByMemberId: MISSING_MEMBER_ID,
				participantMemberIds: [MISSING_MEMBER_ID],
				splitType: "equal",
				expenseDate: "2026-06-13T20:00:00.000Z",
			})
			.expect(404);

		expect(response.body.error).toMatchObject({
			code: "GROUP_NOT_FOUND",
			type: "business",
			statusCode: 404,
		});
	});

	it("POST returns 400 when the payer does not belong to the group", async () => {
		const { group, members } = await createGroupWithMembers(["Gaston", "Ana"]);
		const [gaston, ana] = members;

		const response = await request(app.getHttpServer())
			.post(`/api/v1/groups/${group.id}/expenses`)
			.send({
				title: "Dinner",
				amount: 30000,
				currency: "ARS",
				paidByMemberId: MISSING_GROUP_ID,
				participantMemberIds: [gaston.id, ana.id],
				splitType: "equal",
				expenseDate: "2026-06-13T20:00:00.000Z",
			})
			.expect(400);

		expect(response.body.error).toMatchObject({
			code: "EXPENSE_PAYER_NOT_IN_GROUP",
		});
	});

	it("POST returns 400 when a participant does not belong to the group", async () => {
		const { group, members } = await createGroupWithMembers(["Gaston"]);
		const [gaston] = members;

		const response = await request(app.getHttpServer())
			.post(`/api/v1/groups/${group.id}/expenses`)
			.send({
				title: "Dinner",
				amount: 30000,
				currency: "ARS",
				paidByMemberId: gaston.id,
				participantMemberIds: [gaston.id, MISSING_GROUP_ID],
				splitType: "equal",
				expenseDate: "2026-06-13T20:00:00.000Z",
			})
			.expect(400);

		expect(response.body.error).toMatchObject({
			code: "EXPENSE_PARTICIPANT_NOT_IN_GROUP",
		});
	});

	it("POST returns 400 when the payer is not part of the participants", async () => {
		const { group, members } = await createGroupWithMembers(["Gaston", "Ana"]);
		const [gaston, ana] = members;

		const response = await request(app.getHttpServer())
			.post(`/api/v1/groups/${group.id}/expenses`)
			.send({
				title: "Dinner",
				amount: 30000,
				currency: "ARS",
				paidByMemberId: gaston.id,
				participantMemberIds: [ana.id],
				splitType: "equal",
				expenseDate: "2026-06-13T20:00:00.000Z",
			})
			.expect(400);

		expect(response.body.error).toMatchObject({
			code: "EXPENSE_PAYER_NOT_PARTICIPANT",
		});
	});
});
