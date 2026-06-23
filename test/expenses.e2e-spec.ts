import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Test, type TestingModule } from "@nestjs/testing";
import {
	PostgreSqlContainer,
	type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
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

	async function createAccessibleGroupWithMembers(displayNames: string[]) {
		const group = await prisma.group.create({
			data: {
				ownerUserId: DEV_USER_ID,
				name: "Trip to Bariloche",
				currency: "ARS",
			},
		});

		const devMember = await prisma.groupMember.create({
			data: {
				groupId: group.id,
				userId: DEV_USER_ID,
				displayName: "Development User",
				email: "dev@cuentasclaras.local",
			},
		});

		const members = [devMember];
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

	async function createInaccessibleGroupWithMembers(displayNames: string[]) {
		const otherUser = await prisma.user.create({
			data: {
				name: "Other User",
				email: `other-${randomUUID()}@example.com`,
			},
		});

		const group = await prisma.group.create({
			data: {
				ownerUserId: otherUser.id,
				name: "Private Group",
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

	async function createPersistedExpense(input: {
		groupId: string;
		paidByMemberId: string;
		participantMemberIds: string[];
		title: string;
		expenseDate: Date;
		deletedAt?: Date | null;
	}) {
		const expense = await prisma.expense.create({
			data: {
				groupId: input.groupId,
				title: input.title,
				amount: "30000.00",
				currency: "ARS",
				paidByMemberId: input.paidByMemberId,
				splitType: "EQUAL",
				category: "food",
				notes: "Pizza night",
				expenseDate: input.expenseDate,
				deletedAt: input.deletedAt ?? null,
			},
		});

		await prisma.expenseSplit.createMany({
			data: input.participantMemberIds.map((memberId) => ({
				expenseId: expense.id,
				memberId,
				owedAmount: "15000.00",
				paidAmount: memberId === input.paidByMemberId ? "30000.00" : "0.00",
				netAmount: memberId === input.paidByMemberId ? "15000.00" : "-15000.00",
			})),
		});

		return expense;
	}

	it("POST creates an expense with an equal split and persists the splits", async () => {
		const { group, members } = await createAccessibleGroupWithMembers(["Gaston", "Ana"]);
		const [, gaston, ana] = members;

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

	it("GET /api/v1/groups/:groupId/expenses lists non-deleted expenses ordered by expense date descending", async () => {
		const { group, members } = await createAccessibleGroupWithMembers([
			"Gaston",
			"Ana",
		]);
		const [, gaston, ana] = members;
		const older = await createPersistedExpense({
			groupId: group.id,
			paidByMemberId: gaston.id,
			participantMemberIds: [gaston.id, ana.id],
			title: "Lunch",
			expenseDate: new Date("2026-06-12T20:00:00.000Z"),
		});
		const newer = await createPersistedExpense({
			groupId: group.id,
			paidByMemberId: gaston.id,
			participantMemberIds: [gaston.id, ana.id],
			title: "Dinner",
			expenseDate: new Date("2026-06-13T20:00:00.000Z"),
		});
		await createPersistedExpense({
			groupId: group.id,
			paidByMemberId: gaston.id,
			participantMemberIds: [gaston.id, ana.id],
			title: "Deleted",
			expenseDate: new Date("2026-06-14T20:00:00.000Z"),
			deletedAt: new Date("2026-06-15T20:00:00.000Z"),
		});

		const response = await request(app.getHttpServer())
			.get(`/api/v1/groups/${group.id}/expenses`)
			.expect(200);

		expect(response.body).toEqual({
			data: {
				expenses: [
					{
						id: newer.id,
						groupId: group.id,
						title: "Dinner",
						amount: 30000,
						currency: "ARS",
						paidBy: { id: gaston.id, displayName: "Gaston" },
						participantsCount: 2,
						category: "food",
						expenseDate: "2026-06-13T20:00:00.000Z",
						createdAt: expect.any(String),
					},
					{
						id: older.id,
						groupId: group.id,
						title: "Lunch",
						amount: 30000,
						currency: "ARS",
						paidBy: { id: gaston.id, displayName: "Gaston" },
						participantsCount: 2,
						category: "food",
						expenseDate: "2026-06-12T20:00:00.000Z",
						createdAt: expect.any(String),
					},
				],
				nextCursor: null,
			},
		});
	});

	it("GET /api/v1/groups/:groupId/expenses returns 404 for a group inaccessible to the dev user", async () => {
		const { group, members } = await createInaccessibleGroupWithMembers([
			"Gaston",
			"Ana",
		]);
		const [gaston, ana] = members;
		await createPersistedExpense({
			groupId: group.id,
			paidByMemberId: gaston.id,
			participantMemberIds: [gaston.id, ana.id],
			title: "Private Dinner",
			expenseDate: new Date("2026-06-13T20:00:00.000Z"),
		});

		const response = await request(app.getHttpServer())
			.get(`/api/v1/groups/${group.id}/expenses`)
			.expect(404);

		expect(response.body.error).toMatchObject({
			code: "GROUP_NOT_FOUND",
			type: "business",
			statusCode: 404,
		});
	});

	it("GET /api/v1/groups/:groupId/expenses supports deterministic cursor pagination for equal expense dates", async () => {
		const { group, members } = await createAccessibleGroupWithMembers([
			"Gaston",
			"Ana",
		]);
		const [, gaston, ana] = members;
		const sharedExpenseDate = new Date("2026-06-12T20:00:00.000Z");
		const expenses: Array<{ id: string; expenseDate: Date }> = [];

		expenses.push(
			await createPersistedExpense({
				groupId: group.id,
				paidByMemberId: gaston.id,
				participantMemberIds: [gaston.id, ana.id],
				title: "Breakfast",
				expenseDate: new Date("2026-06-11T20:00:00.000Z"),
			}),
		);
		expenses.push(
			await createPersistedExpense({
				groupId: group.id,
				paidByMemberId: gaston.id,
				participantMemberIds: [gaston.id, ana.id],
				title: "Lunch",
				expenseDate: sharedExpenseDate,
			}),
		);
		expenses.push(
			await createPersistedExpense({
				groupId: group.id,
				paidByMemberId: gaston.id,
				participantMemberIds: [gaston.id, ana.id],
				title: "Snack",
				expenseDate: sharedExpenseDate,
			}),
		);
		expenses.push(
			await createPersistedExpense({
				groupId: group.id,
				paidByMemberId: gaston.id,
				participantMemberIds: [gaston.id, ana.id],
				title: "Dinner",
				expenseDate: new Date("2026-06-13T20:00:00.000Z"),
			}),
		);

		const expectedIds = expenses
			.toSorted((left, right) => {
				const dateComparison =
					right.expenseDate.getTime() - left.expenseDate.getTime();

				if (dateComparison !== 0) {
					return dateComparison;
				}

				return left.id < right.id ? 1 : -1;
			})
			.map((expense) => expense.id);

		const firstPage = await request(app.getHttpServer())
			.get(`/api/v1/groups/${group.id}/expenses?limit=1`)
			.expect(200);

		expect(firstPage.body.data.expenses).toEqual([
			expect.objectContaining({ id: expectedIds[0] }),
		]);
		expect(firstPage.body.data.nextCursor).toBe(expectedIds[1]);

		const secondPage = await request(app.getHttpServer())
			.get(
				`/api/v1/groups/${group.id}/expenses?limit=1&cursor=${firstPage.body.data.nextCursor}`,
			)
			.expect(200);

		expect(secondPage.body.data.expenses).toEqual([
			expect.objectContaining({ id: expectedIds[1] }),
		]);
		expect(secondPage.body.data.nextCursor).toBe(expectedIds[2]);

		const thirdPage = await request(app.getHttpServer())
			.get(
				`/api/v1/groups/${group.id}/expenses?limit=2&cursor=${secondPage.body.data.nextCursor}`,
			)
			.expect(200);

		const pagedIds = [
			...firstPage.body.data.expenses,
			...secondPage.body.data.expenses,
			...thirdPage.body.data.expenses,
		].map((expense: { id: string }) => expense.id);

		expect(
			thirdPage.body.data.expenses.map(
				(expense: { id: string }) => expense.id,
			),
		).toEqual(expectedIds.slice(2));
		expect(thirdPage.body.data.nextCursor).toBeNull();
		expect(pagedIds).toEqual(expectedIds);
		expect(new Set(pagedIds).size).toBe(expectedIds.length);
	});

	it("GET /api/v1/expenses/:expenseId returns expense detail with participants", async () => {
		const { group, members } = await createAccessibleGroupWithMembers([
			"Gaston",
			"Ana",
		]);
		const [, gaston, ana] = members;
		const expense = await createPersistedExpense({
			groupId: group.id,
			paidByMemberId: gaston.id,
			participantMemberIds: [gaston.id, ana.id],
			title: "Dinner",
			expenseDate: new Date("2026-06-13T20:00:00.000Z"),
		});

		const response = await request(app.getHttpServer())
			.get(`/api/v1/expenses/${expense.id}`)
			.expect(200);

		expect(response.body).toEqual({
			data: {
				id: expense.id,
				groupId: group.id,
				title: "Dinner",
				amount: 30000,
				currency: "ARS",
				paidBy: { id: gaston.id, displayName: "Gaston" },
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
	});

	it("GET /api/v1/expenses/:expenseId returns 404 for an expense in a group inaccessible to the dev user", async () => {
		const { group, members } = await createInaccessibleGroupWithMembers([
			"Gaston",
			"Ana",
		]);
		const [gaston, ana] = members;
		const expense = await createPersistedExpense({
			groupId: group.id,
			paidByMemberId: gaston.id,
			participantMemberIds: [gaston.id, ana.id],
			title: "Private Dinner",
			expenseDate: new Date("2026-06-13T20:00:00.000Z"),
		});

		const response = await request(app.getHttpServer())
			.get(`/api/v1/expenses/${expense.id}`)
			.expect(404);

		expect(response.body.error).toMatchObject({
			code: "EXPENSE_NOT_FOUND",
			type: "business",
			statusCode: 404,
		});
	});

	it("GET /api/v1/expenses/:expenseId returns 404 for a deleted expense", async () => {
		const { group, members } = await createAccessibleGroupWithMembers([
			"Gaston",
			"Ana",
		]);
		const [, gaston, ana] = members;
		const expense = await createPersistedExpense({
			groupId: group.id,
			paidByMemberId: gaston.id,
			participantMemberIds: [gaston.id, ana.id],
			title: "Deleted Dinner",
			expenseDate: new Date("2026-06-13T20:00:00.000Z"),
			deletedAt: new Date("2026-06-14T20:00:00.000Z"),
		});

		const response = await request(app.getHttpServer())
			.get(`/api/v1/expenses/${expense.id}`)
			.expect(404);

		expect(response.body.error).toMatchObject({
			code: "EXPENSE_NOT_FOUND",
			type: "business",
			statusCode: 404,
		});
	});

	it("PATCH /api/v1/expenses/:expenseId updates fields and recalculates equal splits", async () => {
		const { group, members } = await createAccessibleGroupWithMembers([
			"Gaston",
			"Ana",
			"Mora",
		]);
		const [, gaston, ana, mora] = members;
		const expense = await createPersistedExpense({
			groupId: group.id,
			paidByMemberId: gaston.id,
			participantMemberIds: [gaston.id, ana.id],
			title: "Dinner",
			expenseDate: new Date("2026-06-13T20:00:00.000Z"),
		});

		const response = await request(app.getHttpServer())
			.patch(`/api/v1/expenses/${expense.id}`)
			.send({
				title: "Updated dinner",
				amount: 35000,
				paidByMemberId: ana.id,
				participantMemberIds: [ana.id, mora.id],
				notes: "Updated notes",
				expenseDate: "2026-06-14T20:00:00.000Z",
			})
			.expect(200);

		expect(response.body).toEqual({
			data: {
				id: expense.id,
				groupId: group.id,
				title: "Updated dinner",
				amount: 35000,
				currency: "ARS",
				paidBy: { id: ana.id, displayName: "Ana" },
				participants: [
					{
						memberId: ana.id,
						displayName: "Ana",
						owedAmount: 17500,
						paidAmount: 35000,
						netAmount: 17500,
					},
					{
						memberId: mora.id,
						displayName: "Mora",
						owedAmount: 17500,
						paidAmount: 0,
						netAmount: -17500,
					},
				],
				splitType: "equal",
				category: "food",
				notes: "Updated notes",
				expenseDate: "2026-06-14T20:00:00.000Z",
				createdAt: expect.any(String),
				updatedAt: expect.any(String),
			},
		});

		const persistedSplits = await prisma.expenseSplit.findMany({
			where: { expenseId: expense.id },
			orderBy: { createdAt: "asc" },
		});
		expect(persistedSplits).toHaveLength(2);
		expect(persistedSplits.map((split) => split.memberId)).toEqual([
			ana.id,
			mora.id,
		]);
	});

	it("PATCH /api/v1/expenses/:expenseId with metadata only preserves participants and splits", async () => {
		const { group, members } = await createAccessibleGroupWithMembers([
			"Gaston",
			"Ana",
		]);
		const [, gaston, ana] = members;
		const expense = await createPersistedExpense({
			groupId: group.id,
			paidByMemberId: gaston.id,
			participantMemberIds: [gaston.id, ana.id],
			title: "Dinner",
			expenseDate: new Date("2026-06-13T20:00:00.000Z"),
		});
		const originalSplits = await prisma.expenseSplit.findMany({
			where: { expenseId: expense.id },
			orderBy: { createdAt: "asc" },
		});

		const response = await request(app.getHttpServer())
			.patch(`/api/v1/expenses/${expense.id}`)
			.send({
				title: "Updated dinner title",
				category: "transport",
				notes: "Updated notes only",
				expenseDate: "2026-06-14T20:00:00.000Z",
			})
			.expect(200);

		expect(response.body.data).toMatchObject({
			id: expense.id,
			groupId: group.id,
			title: "Updated dinner title",
			amount: 30000,
			currency: "ARS",
			paidBy: { id: gaston.id, displayName: "Gaston" },
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
			category: "transport",
			notes: "Updated notes only",
			expenseDate: "2026-06-14T20:00:00.000Z",
		});

		const persistedSplits = await prisma.expenseSplit.findMany({
			where: { expenseId: expense.id },
			orderBy: { createdAt: "asc" },
		});
		expect(
			persistedSplits.map((split) => ({
				id: split.id,
				memberId: split.memberId,
				owedAmount: split.owedAmount.toString(),
				paidAmount: split.paidAmount.toString(),
				netAmount: split.netAmount.toString(),
			})),
		).toEqual(
			originalSplits.map((split) => ({
				id: split.id,
				memberId: split.memberId,
				owedAmount: split.owedAmount.toString(),
				paidAmount: split.paidAmount.toString(),
				netAmount: split.netAmount.toString(),
			})),
		);
	});

	it("PATCH /api/v1/expenses/:expenseId with metadata only succeeds when a split participant was removed", async () => {
		const { group, members } = await createAccessibleGroupWithMembers([
			"Gaston",
			"Ana",
		]);
		const [, gaston, ana] = members;
		const expense = await createPersistedExpense({
			groupId: group.id,
			paidByMemberId: gaston.id,
			participantMemberIds: [gaston.id, ana.id],
			title: "Dinner",
			expenseDate: new Date("2026-06-13T20:00:00.000Z"),
		});
		const originalSplits = await prisma.expenseSplit.findMany({
			where: { expenseId: expense.id },
			orderBy: { createdAt: "asc" },
		});

		await prisma.groupMember.update({
			where: { id: ana.id },
			data: { removedAt: new Date("2026-06-14T12:00:00.000Z") },
		});

		const response = await request(app.getHttpServer())
			.patch(`/api/v1/expenses/${expense.id}`)
			.send({ notes: "Metadata changed after member removal" })
			.expect(200);

		expect(response.body.data.participants).toEqual([
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
		]);
		expect(response.body.data.notes).toBe(
			"Metadata changed after member removal",
		);

		const persistedSplits = await prisma.expenseSplit.findMany({
			where: { expenseId: expense.id },
			orderBy: { createdAt: "asc" },
		});
		expect(persistedSplits.map((split) => split.id)).toEqual(
			originalSplits.map((split) => split.id),
		);
	});

	it("PATCH /api/v1/expenses/:expenseId returns 400 for invalid payloads", async () => {
		const { group, members } = await createAccessibleGroupWithMembers([
			"Gaston",
			"Ana",
		]);
		const [, gaston, ana] = members;
		const expense = await createPersistedExpense({
			groupId: group.id,
			paidByMemberId: gaston.id,
			participantMemberIds: [gaston.id, ana.id],
			title: "Dinner",
			expenseDate: new Date("2026-06-13T20:00:00.000Z"),
		});

		for (const body of [
			{ title: "" },
			{ amount: 0 },
			{ paidByMemberId: "not-a-uuid" },
			{ participantMemberIds: [] },
			{ splitType: "custom" },
			{ expenseDate: "not-a-date" },
		]) {
			await request(app.getHttpServer())
				.patch(`/api/v1/expenses/${expense.id}`)
				.send(body)
				.expect(400);
		}
	});

	it("PATCH /api/v1/expenses/:expenseId returns 404 for a deleted expense", async () => {
		const { group, members } = await createAccessibleGroupWithMembers([
			"Gaston",
			"Ana",
		]);
		const [, gaston, ana] = members;
		const expense = await createPersistedExpense({
			groupId: group.id,
			paidByMemberId: gaston.id,
			participantMemberIds: [gaston.id, ana.id],
			title: "Deleted Dinner",
			expenseDate: new Date("2026-06-13T20:00:00.000Z"),
			deletedAt: new Date("2026-06-14T20:00:00.000Z"),
		});

		const response = await request(app.getHttpServer())
			.patch(`/api/v1/expenses/${expense.id}`)
			.send({ title: "Updated" })
			.expect(404);

		expect(response.body.error).toMatchObject({
			code: "EXPENSE_NOT_FOUND",
			type: "business",
			statusCode: 404,
		});
	});

	it("DELETE /api/v1/expenses/:expenseId soft deletes an accessible expense", async () => {
		const { group, members } = await createAccessibleGroupWithMembers([
			"Gaston",
			"Ana",
		]);
		const [, gaston, ana] = members;
		const expense = await createPersistedExpense({
			groupId: group.id,
			paidByMemberId: gaston.id,
			participantMemberIds: [gaston.id, ana.id],
			title: "Dinner",
			expenseDate: new Date("2026-06-13T20:00:00.000Z"),
		});

		const response = await request(app.getHttpServer())
			.delete(`/api/v1/expenses/${expense.id}`)
			.expect(200);

		expect(response.body).toEqual({
			data: {
				id: expense.id,
				deletedAt: expect.any(String),
			},
		});

		const deleted = await prisma.expense.findUniqueOrThrow({
			where: { id: expense.id },
		});
		expect(deleted.deletedAt).toBeInstanceOf(Date);

		await request(app.getHttpServer())
			.get(`/api/v1/expenses/${expense.id}`)
			.expect(404);

		const listResponse = await request(app.getHttpServer())
			.get(`/api/v1/groups/${group.id}/expenses`)
			.expect(200);
		expect(listResponse.body.data.expenses).toEqual([]);
	});

	it("DELETE /api/v1/expenses/:expenseId returns 404 for an inaccessible expense", async () => {
		const { group, members } = await createInaccessibleGroupWithMembers([
			"Gaston",
			"Ana",
		]);
		const [gaston, ana] = members;
		const expense = await createPersistedExpense({
			groupId: group.id,
			paidByMemberId: gaston.id,
			participantMemberIds: [gaston.id, ana.id],
			title: "Private Dinner",
			expenseDate: new Date("2026-06-13T20:00:00.000Z"),
		});

		const response = await request(app.getHttpServer())
			.delete(`/api/v1/expenses/${expense.id}`)
			.expect(404);

		expect(response.body.error).toMatchObject({
			code: "EXPENSE_NOT_FOUND",
			type: "business",
			statusCode: 404,
		});
	});

	it("POST distributes remainder cents so the split stays exact", async () => {
		const { group, members } = await createAccessibleGroupWithMembers(["A", "B", "C"]);
		const [, a, b, c] = members;

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
		const { group, members } = await createAccessibleGroupWithMembers(["Gaston", "Ana"]);
		const [, gaston, ana] = members;

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
		const { group, members } = await createAccessibleGroupWithMembers(["Gaston", "Ana"]);
		const [, gaston, ana] = members;

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
		const { group, members } = await createAccessibleGroupWithMembers(["Gaston"]);
		const [, gaston] = members;

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
		const { group, members } = await createAccessibleGroupWithMembers(["Gaston", "Ana"]);
		const [, gaston, ana] = members;

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
