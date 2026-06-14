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

describe("Groups endpoints (e2e)", () => {
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

	it("POST /api/v1/groups creates a group with invited members", async () => {
		const response = await request(app.getHttpServer())
			.post("/api/v1/groups")
			.send({
				name: "Trip to Bariloche",
				description: "Shared expenses for the trip",
				type: "trip",
				currency: "ARS",
				members: [
					{
						displayName: "Ana",
						email: "ana@example.com",
					},
				],
			})
			.expect(201);

		expect(response.body).toEqual({
			data: {
				id: expect.any(String),
				name: "Trip to Bariloche",
				description: "Shared expenses for the trip",
				type: "trip",
				currency: "ARS",
				membersCount: 2,
				expensesCount: 0,
				totalAmount: 0,
				currentUserBalance: 0,
				createdAt: expect.any(String),
				updatedAt: expect.any(String),
			},
		});

		const createdGroup = await prisma.group.findUniqueOrThrow({
			where: {
				id: response.body.data.id,
			},
			include: {
				groupMembers: {
					orderBy: {
						createdAt: "asc",
					},
				},
			},
		});

		expect(createdGroup.ownerUserId).toBe(DEV_USER_ID);
		expect(createdGroup.type).toBe("TRIP");
		expect(createdGroup.groupMembers).toHaveLength(2);
		expect(createdGroup.groupMembers[0]).toMatchObject({
			userId: DEV_USER_ID,
			displayName: "Development User",
			email: "dev@cuentasclaras.local",
		});
		expect(createdGroup.groupMembers[1]).toMatchObject({
			userId: null,
			displayName: "Ana",
			email: "ana@example.com",
		});
	});

	it("POST /api/v1/groups creates a group without invited members and keeps the creator membership", async () => {
		const response = await request(app.getHttpServer())
			.post("/api/v1/groups")
			.send({
				name: "Home",
				type: "home",
				currency: "USD",
			})
			.expect(201);

		expect(response.body.data.membersCount).toBe(1);
		expect(response.body.data.type).toBe("home");
	});

	it("POST /api/v1/groups makes the created group visible in list and detail", async () => {
		const createResponse = await request(app.getHttpServer())
			.post("/api/v1/groups")
			.send({
				name: "Friends Weekend",
				type: "friends",
				currency: "ARS",
			})
			.expect(201);

		const groupId = createResponse.body.data.id;

		const listResponse = await request(app.getHttpServer())
			.get("/api/v1/groups")
			.expect(200);

		expect(listResponse.body.data).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: groupId,
					name: "Friends Weekend",
				}),
			]),
		);

		const detailResponse = await request(app.getHttpServer())
			.get(`/api/v1/groups/${groupId}`)
			.expect(200);

		expect(detailResponse.body.data).toEqual(
			expect.objectContaining({
				id: groupId,
				name: "Friends Weekend",
				members: [
					expect.objectContaining({
						displayName: "Development User",
						isCurrentUser: true,
					}),
				],
			}),
		);
	});

	it("POST /api/v1/groups returns 400 for invalid payloads", async () => {
		await request(app.getHttpServer())
			.post("/api/v1/groups")
			.send({
				type: "trip",
				currency: "ARS",
			})
			.expect(400);

		await request(app.getHttpServer())
			.post("/api/v1/groups")
			.send({
				name: "Trip to Bariloche",
				type: "invalid",
				currency: "ARS",
			})
			.expect(400);

		await request(app.getHttpServer())
			.post("/api/v1/groups")
			.send({
				name: "Trip to Bariloche",
				type: "trip",
				currency: "ars",
			})
			.expect(400);

		await request(app.getHttpServer())
			.post("/api/v1/groups")
			.send({
				name: "Trip to Bariloche",
				type: "trip",
				currency: "ARS",
				members: [
					{
					email: "ana@example.com",
				},
			],
		})
			.expect(400);

		await request(app.getHttpServer())
			.post("/api/v1/groups")
			.send({
				name: "Trip to Bariloche",
				type: "trip",
				currency: "ARS",
				members: null,
			})
			.expect(400);

		await request(app.getHttpServer())
			.post("/api/v1/groups")
			.send({
				name: "Trip to Bariloche",
				type: "trip",
				currency: "ARS",
				members: [
					{
						displayName: "Ana",
						email: null,
					},
				],
			})
			.expect(400);
	});

	// ─── GET /api/v1/groups (list) ──────────────────────────────────────

	it("GET /api/v1/groups returns an empty array when the dev user has no groups", async () => {
		const response = await request(app.getHttpServer())
			.get("/api/v1/groups")
			.expect(200);

		expect(response.body).toEqual({ data: [] });
	});

	it("GET /api/v1/groups returns groups where the dev user is an active member", async () => {
		const group1 = await prisma.group.create({
			data: {
				ownerUserId: "00000000-0000-0000-0000-000000000001",
				name: "Trip to Bariloche",
				description: "Shared expenses for the trip",
				currency: "ARS",
			},
		});

		await prisma.groupMember.create({
			data: {
				groupId: group1.id,
				userId: "00000000-0000-0000-0000-000000000001",
				displayName: "Development User",
				email: "dev@cuentasclaras.local",
			},
		});

		const group2 = await prisma.group.create({
			data: {
				ownerUserId: "00000000-0000-0000-0000-000000000001",
				name: "Apartment",
				description: null,
				currency: "USD",
			},
		});

		await prisma.groupMember.create({
			data: {
				groupId: group2.id,
				userId: "00000000-0000-0000-0000-000000000001",
				displayName: "Development User",
				email: "dev@cuentasclaras.local",
			},
		});

		const response = await request(app.getHttpServer())
			.get("/api/v1/groups")
			.expect(200);

		expect(response.body.data).toHaveLength(2);
		expect(response.body.data[0]).toEqual({
			id: expect.any(String),
			name: expect.any(String),
			description: expect.toBeOneOf([expect.any(String), null]),
			currency: expect.any(String),
			createdAt: expect.any(String),
			updatedAt: expect.any(String),
		});
	});

	it("GET /api/v1/groups excludes archived groups", async () => {
		const activeGroup = await prisma.group.create({
			data: {
				ownerUserId: "00000000-0000-0000-0000-000000000001",
				name: "Active Group",
				currency: "ARS",
			},
		});

		await prisma.groupMember.create({
			data: {
				groupId: activeGroup.id,
				userId: "00000000-0000-0000-0000-000000000001",
				displayName: "Development User",
				email: "dev@cuentasclaras.local",
			},
		});

		const archivedGroup = await prisma.group.create({
			data: {
				ownerUserId: "00000000-0000-0000-0000-000000000001",
				name: "Archived Group",
				currency: "ARS",
				archivedAt: new Date("2026-06-01T00:00:00.000Z"),
			},
		});

		await prisma.groupMember.create({
			data: {
				groupId: archivedGroup.id,
				userId: "00000000-0000-0000-0000-000000000001",
				displayName: "Development User",
				email: "dev@cuentasclaras.local",
			},
		});

		const response = await request(app.getHttpServer())
			.get("/api/v1/groups")
			.expect(200);

		expect(response.body.data).toHaveLength(1);
		expect(response.body.data[0].name).toBe("Active Group");
	});

	it("GET /api/v1/groups excludes groups where the dev user is not a member", async () => {
		const otherUser = await prisma.user.create({
			data: {
				name: "Other User",
				email: "other-list@example.com",
			},
		});

		const otherGroup = await prisma.group.create({
			data: {
				ownerUserId: otherUser.id,
				name: "Not My Group",
				currency: "USD",
			},
		});

		await prisma.groupMember.create({
			data: {
				groupId: otherGroup.id,
				userId: otherUser.id,
				displayName: "Other User",
				email: "other-list@example.com",
			},
		});

		const response = await request(app.getHttpServer())
			.get("/api/v1/groups")
			.expect(200);

		expect(response.body.data).toHaveLength(0);
	});

	it("GET /api/v1/groups excludes groups where the dev user membership was soft-removed", async () => {
		const group = await prisma.group.create({
			data: {
				ownerUserId: "00000000-0000-0000-0000-000000000001",
				name: "Removed membership",
				currency: "ARS",
			},
		});

		await prisma.groupMember.create({
			data: {
				groupId: group.id,
				userId: "00000000-0000-0000-0000-000000000001",
				displayName: "Development User",
				email: "dev@cuentasclaras.local",
				removedAt: new Date("2026-06-12T12:00:00.000Z"),
			},
		});

		const response = await request(app.getHttpServer())
			.get("/api/v1/groups")
			.expect(200);

		expect(response.body.data).toHaveLength(0);
	});

	it("GET /api/v1/groups returns groups ordered by updatedAt descending", async () => {
		const olderGroup = await prisma.group.create({
			data: {
				ownerUserId: "00000000-0000-0000-0000-000000000001",
				name: "Older Group",
				currency: "ARS",
				createdAt: new Date("2026-01-01T00:00:00.000Z"),
				updatedAt: new Date("2026-01-01T00:00:00.000Z"),
			},
		});

		await prisma.groupMember.create({
			data: {
				groupId: olderGroup.id,
				userId: "00000000-0000-0000-0000-000000000001",
				displayName: "Development User",
				email: "dev@cuentasclaras.local",
			},
		});

		const newerGroup = await prisma.group.create({
			data: {
				ownerUserId: "00000000-0000-0000-0000-000000000001",
				name: "Newer Group",
				currency: "USD",
				createdAt: new Date("2026-06-01T00:00:00.000Z"),
				updatedAt: new Date("2026-06-01T00:00:00.000Z"),
			},
		});

		await prisma.groupMember.create({
			data: {
				groupId: newerGroup.id,
				userId: "00000000-0000-0000-0000-000000000001",
				displayName: "Development User",
				email: "dev@cuentasclaras.local",
			},
		});

		const response = await request(app.getHttpServer())
			.get("/api/v1/groups")
			.expect(200);

		expect(response.body.data).toHaveLength(2);
		expect(response.body.data[0].name).toBe("Newer Group");
		expect(response.body.data[1].name).toBe("Older Group");
	});

	it("GET /api/v1/groups does not shadow GET /api/v1/groups/:groupId", async () => {
		const group = await prisma.group.create({
			data: {
				ownerUserId: "00000000-0000-0000-0000-000000000001",
				name: "Detail group",
				description: "For detail check",
				currency: "ARS",
			},
		});

		await prisma.groupMember.create({
			data: {
				groupId: group.id,
				userId: "00000000-0000-0000-0000-000000000001",
				displayName: "Development User",
				email: "dev@cuentasclaras.local",
			},
		});

		// List endpoint still works
		const listResponse = await request(app.getHttpServer())
			.get("/api/v1/groups")
			.expect(200);

		expect(listResponse.body.data).toHaveLength(1);

		// Detail endpoint still works
		const detailResponse = await request(app.getHttpServer())
			.get(`/api/v1/groups/${group.id}`)
			.expect(200);

		expect(detailResponse.body.data.id).toBe(group.id);
		expect(detailResponse.body.data.members).toBeDefined();
	});

	// ─── GET /api/v1/groups/:groupId (detail) ───────────────────────────

	it("GET /api/v1/groups/:groupId returns the group detail for the dev user", async () => {
		const group = await prisma.group.create({
			data: {
				ownerUserId: "00000000-0000-0000-0000-000000000001",
				name: "Trip to Bariloche",
				description: "Shared expenses for the trip",
				currency: "ARS",
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

		await prisma.expense.create({
			data: {
				groupId: group.id,
				title: "Hotel",
				amount: "120.50",
				currency: "ARS",
				paidByMemberId: member.id,
				splitType: "EQUAL",
				expenseDate: new Date("2026-06-12T00:00:00.000Z"),
			},
		});

		const response = await request(app.getHttpServer())
			.get(`/api/v1/groups/${group.id}`)
			.expect(200);

		expect(response.body).toEqual({
			data: {
				id: group.id,
				name: "Trip to Bariloche",
				description: "Shared expenses for the trip",
				currency: "ARS",
				members: [
					{
						id: member.id,
						displayName: "Development User",
						email: "dev@cuentasclaras.local",
						isCurrentUser: true,
						removedAt: null,
					},
				],
				expenses: [],
				balances: [],
				createdAt: group.createdAt.toISOString(),
				updatedAt: group.updatedAt.toISOString(),
			},
		});
	});

	it("GET /api/v1/groups/:groupId returns the group detail when the dev user is a member but not the owner", async () => {
		const otherUser = await prisma.user.create({
			data: {
				name: "Other User",
				email: "other@example.com",
			},
		});

		const group = await prisma.group.create({
			data: {
				ownerUserId: otherUser.id,
				name: "Private Group",
				currency: "ARS",
			},
		});

		await prisma.groupMember.create({
			data: {
				groupId: group.id,
				userId: "00000000-0000-0000-0000-000000000001",
				displayName: "Development User",
				email: "dev@cuentasclaras.local",
			},
		});

		await request(app.getHttpServer())
			.get(`/api/v1/groups/${group.id}`)
			.expect(200);
	});

	it("GET /api/v1/groups/:groupId returns 404 when the dev user does not belong to the group", async () => {
		const otherUser = await prisma.user.create({
			data: {
				name: "Other User",
				email: "other-2@example.com",
			},
		});

		const group = await prisma.group.create({
			data: {
				ownerUserId: otherUser.id,
				name: "Private Group",
				currency: "ARS",
			},
		});

		await request(app.getHttpServer())
			.get(`/api/v1/groups/${group.id}`)
			.expect(404);
	});

	it("PATCH /api/v1/groups/:groupId updates the group when the dev user is a member but not the owner", async () => {
		const otherUser = await prisma.user.create({
			data: {
				name: "Group Owner",
				email: "owner@example.com",
			},
		});

		const group = await prisma.group.create({
			data: {
				ownerUserId: otherUser.id,
				name: "Old name",
				description: "Old description",
				currency: "USD",
			},
		});

		await prisma.groupMember.create({
			data: {
				groupId: group.id,
				userId: "00000000-0000-0000-0000-000000000001",
				displayName: "Development User",
				email: "dev@cuentasclaras.local",
			},
		});

		await request(app.getHttpServer())
			.patch(`/api/v1/groups/${group.id}`)
			.send({
				name: "Updated name",
			})
			.expect(200);
	});

	it("PATCH /api/v1/groups/:groupId returns 404 when the group does not exist", async () => {
		await request(app.getHttpServer())
			.patch("/api/v1/groups/11111111-1111-1111-1111-111111111111")
			.send({
				name: "Updated name",
			})
			.expect(404);
	});

	it("PATCH /api/v1/groups/:groupId returns 404 when the dev user is not an active member", async () => {
		const group = await prisma.group.create({
			data: {
				ownerUserId: "00000000-0000-0000-0000-000000000001",
				name: "Inactive member group",
				currency: "ARS",
			},
		});

		await prisma.groupMember.create({
			data: {
				groupId: group.id,
				userId: "00000000-0000-0000-0000-000000000001",
				displayName: "Development User",
				email: "dev@cuentasclaras.local",
				removedAt: new Date("2026-06-12T12:00:00.000Z"),
			},
		});

		await request(app.getHttpServer())
			.patch(`/api/v1/groups/${group.id}`)
			.send({
				name: "Updated name",
			})
			.expect(404);
	});

	it("PATCH /api/v1/groups/:groupId updates the group", async () => {
		const group = await prisma.group.create({
			data: {
				ownerUserId: "00000000-0000-0000-0000-000000000001",
				name: "Old name",
				description: "Old description",
				type: "HOME",
				currency: "USD",
			},
		});

		await prisma.groupMember.create({
			data: {
				groupId: group.id,
				userId: "00000000-0000-0000-0000-000000000001",
				displayName: "Development User",
				email: "dev@cuentasclaras.local",
			},
		});

		const response = await request(app.getHttpServer())
			.patch(`/api/v1/groups/${group.id}`)
			.send({
				name: "Updated name",
				description: "Updated description",
				type: "trip",
				currency: "ARS",
			})
			.expect(200);

		expect(response.body).toEqual({
			data: {
				id: group.id,
				name: "Updated name",
				description: "Updated description",
				type: "trip",
				currency: "ARS",
				membersCount: 1,
				expensesCount: 0,
				totalAmount: 0,
				currentUserBalance: 0,
				updatedAt: expect.any(String),
			},
		});

		const updatedGroup = await prisma.group.findUniqueOrThrow({
			where: {
				id: group.id,
			},
		});

		expect(updatedGroup.name).toBe("Updated name");
		expect(updatedGroup.description).toBe("Updated description");
		expect(updatedGroup.type).toBe("TRIP");
		expect(updatedGroup.currency).toBe("ARS");
	});

	it("PATCH /api/v1/groups/:groupId with members replaces invited members and keeps the dev user active", async () => {
		const group = await prisma.group.create({
			data: {
				ownerUserId: DEV_USER_ID,
				name: "Trip",
				type: "TRIP",
				currency: "ARS",
			},
		});

		await prisma.groupMember.create({
			data: {
				groupId: group.id,
				userId: DEV_USER_ID,
				displayName: "Development User",
				email: "dev@cuentasclaras.local",
			},
		});

		const existingToUpdate = await prisma.groupMember.create({
			data: {
				groupId: group.id,
				userId: null,
				displayName: "Old Ana",
				email: "ana@example.com",
			},
		});

		const existingToRemove = await prisma.groupMember.create({
			data: {
				groupId: group.id,
				userId: null,
				displayName: "Old Bob",
				email: "bob@example.com",
			},
		});

		const removedToReactivate = await prisma.groupMember.create({
			data: {
				groupId: group.id,
				userId: null,
				displayName: "Old Carla",
				email: "carla@example.com",
				removedAt: new Date("2026-06-12T10:00:00.000Z"),
			},
		});

		const response = await request(app.getHttpServer())
			.patch(`/api/v1/groups/${group.id}`)
			.send({
				members: [
					{
						displayName: "Ana Updated",
						email: "ana@example.com",
					},
					{
						displayName: "Carla Reactivated",
						email: "carla@example.com",
					},
					{
						displayName: "Diego New",
						email: "diego@example.com",
					},
				],
			})
			.expect(200);

		expect(response.body.data.membersCount).toBe(4);

		const members = await prisma.groupMember.findMany({
			where: {
				groupId: group.id,
			},
			orderBy: {
				createdAt: "asc",
			},
		});

		const devMember = members.find((member) => member.userId === DEV_USER_ID);
		const updatedMember = members.find((member) => member.id === existingToUpdate.id);
		const removedMember = members.find((member) => member.id === existingToRemove.id);
		const reactivatedMember = members.find(
			(member) => member.id === removedToReactivate.id,
		);
		const newMember = members.find((member) => member.email === "diego@example.com");

		expect(devMember?.removedAt).toBeNull();
		expect(updatedMember).toMatchObject({
			displayName: "Ana Updated",
			email: "ana@example.com",
			removedAt: null,
		});
		expect(removedMember?.removedAt).toBeInstanceOf(Date);
		expect(reactivatedMember).toMatchObject({
			displayName: "Carla Reactivated",
			email: "carla@example.com",
			removedAt: null,
		});
		expect(newMember).toMatchObject({
			userId: null,
			displayName: "Diego New",
			email: "diego@example.com",
			removedAt: null,
		});
	});

	it("PATCH /api/v1/groups/:groupId with members: [] removes all invited members but keeps the dev user", async () => {
		const group = await prisma.group.create({
			data: {
				ownerUserId: DEV_USER_ID,
				name: "Trip",
				type: "TRIP",
				currency: "ARS",
			},
		});

		await prisma.groupMember.create({
			data: {
				groupId: group.id,
				userId: DEV_USER_ID,
				displayName: "Development User",
				email: "dev@cuentasclaras.local",
			},
		});

		const invitedMember = await prisma.groupMember.create({
			data: {
				groupId: group.id,
				userId: null,
				displayName: "Ana",
				email: "ana@example.com",
			},
		});

		const response = await request(app.getHttpServer())
			.patch(`/api/v1/groups/${group.id}`)
			.send({
				members: [],
			})
			.expect(200);

		expect(response.body.data.membersCount).toBe(1);

		const updatedInvitedMember = await prisma.groupMember.findUniqueOrThrow({
			where: {
				id: invitedMember.id,
			},
		});

		expect(updatedInvitedMember.removedAt).toBeInstanceOf(Date);

		const detailResponse = await request(app.getHttpServer())
			.get(`/api/v1/groups/${group.id}`)
			.expect(200);

		expect(detailResponse.body.data.members).toEqual([
			expect.objectContaining({
				displayName: "Development User",
				isCurrentUser: true,
			}),
		]);
	});

	it("PATCH /api/v1/groups/:groupId allows clearing the description with null", async () => {
		const group = await prisma.group.create({
			data: {
				ownerUserId: "00000000-0000-0000-0000-000000000001",
				name: "Old name",
				description: "Old description",
				type: "HOME",
				currency: "USD",
			},
		});

		await prisma.groupMember.create({
			data: {
				groupId: group.id,
				userId: "00000000-0000-0000-0000-000000000001",
				displayName: "Development User",
				email: "dev@cuentasclaras.local",
			},
		});

		const response = await request(app.getHttpServer())
			.patch(`/api/v1/groups/${group.id}`)
			.send({
				description: null,
			})
			.expect(200);

		expect(response.body).toEqual({
			data: {
				id: group.id,
				name: "Old name",
				description: null,
				type: "home",
				currency: "USD",
				membersCount: 1,
				expensesCount: 0,
				totalAmount: 0,
				currentUserBalance: 0,
				updatedAt: expect.any(String),
			},
		});

		const updatedGroup = await prisma.group.findUniqueOrThrow({
			where: {
				id: group.id,
			},
		});

		expect(updatedGroup.description).toBeNull();
	});

	it("PATCH /api/v1/groups/:groupId rejects an empty body", async () => {
		const group = await prisma.group.create({
			data: {
				ownerUserId: "00000000-0000-0000-0000-000000000001",
				name: "Old name",
				currency: "USD",
			},
		});

		const response = await request(app.getHttpServer())
			.patch(`/api/v1/groups/${group.id}`)
			.send({})
			.expect(400);

		expect(response.body.error).toEqual({
			code: "VALIDATION_ERROR",
			message: expect.stringContaining("At least one field must be provided."),
			type: "validation",
			statusCode: 400,
			path: `/api/v1/groups/${group.id}`,
			timestamp: expect.any(String),
		});
	});

	it("PATCH /api/v1/groups/:groupId rejects null for non-nullable optional fields", async () => {
		const group = await prisma.group.create({
			data: {
				ownerUserId: DEV_USER_ID,
				name: "Old name",
				type: "TRIP",
				currency: "ARS",
			},
		});

		await prisma.groupMember.create({
			data: {
				groupId: group.id,
				userId: DEV_USER_ID,
				displayName: "Development User",
				email: "dev@cuentasclaras.local",
			},
		});

		for (const payload of [
			{ name: null },
			{ type: null },
			{ currency: null },
			{ members: null },
			{ members: [{ displayName: "Ana", email: null }] },
			{ name: "   " },
		]) {
			await request(app.getHttpServer())
				.patch(`/api/v1/groups/${group.id}`)
				.send(payload)
				.expect(400);
		}
	});

	it("PATCH /api/v1/groups/:groupId returns zero placeholder aggregates even when expenses exist", async () => {
		const group = await prisma.group.create({
			data: {
				ownerUserId: DEV_USER_ID,
				name: "Trip",
				type: "TRIP",
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

		await prisma.expense.create({
			data: {
				groupId: group.id,
				title: "Dinner",
				amount: "125.50",
				currency: "ARS",
				paidByMemberId: devMember.id,
				splitType: "EQUAL",
				expenseDate: new Date("2026-06-13T20:00:00.000Z"),
			},
		});

		const response = await request(app.getHttpServer())
			.patch(`/api/v1/groups/${group.id}`)
			.send({
				name: "Trip updated",
			})
			.expect(200);

		expect(response.body.data).toEqual(
			expect.objectContaining({
				id: group.id,
				name: "Trip updated",
				expensesCount: 0,
				totalAmount: 0,
				currentUserBalance: 0,
			}),
		);
	});

	it("DELETE /api/v1/groups/:groupId archives the group with a soft delete", async () => {
		const group = await prisma.group.create({
			data: {
				ownerUserId: "00000000-0000-0000-0000-000000000001",
				name: "Trip",
				currency: "ARS",
			},
		});

		await prisma.groupMember.create({
			data: {
				groupId: group.id,
				userId: "00000000-0000-0000-0000-000000000001",
				displayName: "Development User",
				email: "dev@cuentasclaras.local",
			},
		});

		const response = await request(app.getHttpServer())
			.delete(`/api/v1/groups/${group.id}`)
			.expect(200);

		expect(response.body).toEqual({
			data: {
				id: group.id,
				archivedAt: expect.any(String),
			},
		});

		const archivedGroup = await prisma.group.findUniqueOrThrow({
			where: {
				id: group.id,
			},
		});

		expect(archivedGroup.archivedAt).not.toBeNull();

		await request(app.getHttpServer())
			.get(`/api/v1/groups/${group.id}`)
			.expect(404);
	});

	it("DELETE /api/v1/groups/:groupId archives the group when the dev user is a member but not the owner", async () => {
		const otherUser = await prisma.user.create({
			data: {
				name: "Group Owner",
				email: "owner-delete@example.com",
			},
		});

		const group = await prisma.group.create({
			data: {
				ownerUserId: otherUser.id,
				name: "Trip",
				currency: "ARS",
			},
		});

		await prisma.groupMember.create({
			data: {
				groupId: group.id,
				userId: "00000000-0000-0000-0000-000000000001",
				displayName: "Development User",
				email: "dev@cuentasclaras.local",
			},
		});

		await request(app.getHttpServer())
			.delete(`/api/v1/groups/${group.id}`)
			.expect(200);
	});

	it("DELETE /api/v1/groups/:groupId returns the business error envelope when the group does not exist", async () => {
		const response = await request(app.getHttpServer())
			.delete("/api/v1/groups/11111111-1111-1111-1111-111111111111")
			.expect(404);

		expect(response.body).toEqual({
			error: {
				code: "GROUP_NOT_FOUND",
				message: "Group not found.",
				type: "business",
				statusCode: 404,
				path: "/api/v1/groups/11111111-1111-1111-1111-111111111111",
				timestamp: expect.any(String),
			},
		});
	});

	it("DELETE /api/v1/groups/:groupId returns 404 when the dev user is not an active member", async () => {
		const group = await prisma.group.create({
			data: {
				ownerUserId: "00000000-0000-0000-0000-000000000001",
				name: "Inactive member group",
				currency: "ARS",
			},
		});

		await prisma.groupMember.create({
			data: {
				groupId: group.id,
				userId: "00000000-0000-0000-0000-000000000001",
				displayName: "Development User",
				email: "dev@cuentasclaras.local",
				removedAt: new Date("2026-06-12T12:00:00.000Z"),
			},
		});

		await request(app.getHttpServer())
			.delete(`/api/v1/groups/${group.id}`)
			.expect(404);
	});
});
