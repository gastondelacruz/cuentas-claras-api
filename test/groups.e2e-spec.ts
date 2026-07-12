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
import {
	MailDeliveryPort,
	type GroupInvitationEmailInput,
	type VerificationEmailInput,
} from "../src/shared/mail/domain/ports/mail-delivery.port";
import { HttpExceptionFilter } from "../src/shared/filters/http-exception.filter";
import { ResponseInterceptor } from "../src/shared/interceptors/response.interceptor";
import {
	configureDefaultBearerAuth,
	createBearerToken,
	createExpiredBearerToken,
} from "./helpers/auth.helper";

const DEV_USER_ID = "00000000-0000-0000-0000-000000000001";
const DEV_USER_EMAIL = "dev@cuentasclaras.local";

describe("Groups endpoints (e2e)", () => {
	let app: INestApplication;
	let postgresContainer: StartedPostgreSqlContainer;
	let prisma: PrismaClient;
	let mail: CapturingMailDelivery;

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

		execSync("pnpm exec prisma db push", {
			cwd: process.cwd(),
			env: process.env,
			stdio: "inherit",
		});

		execSync("pnpm exec prisma db seed", {
			cwd: process.cwd(),
			env: process.env,
			stdio: "inherit",
		});

		const adapter = new PrismaPg({
			connectionString: process.env.DATABASE_URL,
		});
		prisma = new PrismaClient({ adapter });
		await prisma.$connect();

		mail = new CapturingMailDelivery();
		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule],
		})
			.overrideProvider(MailDeliveryPort)
			.useValue(mail)
			.compile();

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
		mail.clear();
		await prisma.expenseSplit.deleteMany();
		await prisma.expense.deleteMany();
		await prisma.settlementPayment.deleteMany();
		await prisma.groupInvitationToken.deleteMany();
		await prisma.groupMember.deleteMany();
		await prisma.group.deleteMany();
		await prisma.emailVerificationToken.deleteMany();
		await prisma.refreshToken.deleteMany();
		await prisma.account.deleteMany({
			where: {
				userId: {
					not: DEV_USER_ID,
				},
			},
		});
		await prisma.user.deleteMany({
			where: {
				id: {
					not: DEV_USER_ID,
				},
			},
		});
	});

	it("GET /api/v1/groups returns 401 without a bearer token", async () => {
		await request(app.getHttpServer())
			.get("/api/v1/groups")
			.set("x-skip-test-auth", "true")
			.expect(401);
	});

	it("GET /api/v1/groups returns 401 with an expired bearer token", async () => {
		await request(app.getHttpServer())
			.get("/api/v1/groups")
			.set(
				"Authorization",
				createExpiredBearerToken({
					userId: DEV_USER_ID,
					email: DEV_USER_EMAIL,
				}),
			)
			.expect(401);
	});

	it("GET /api/v1/groups returns 401 with a malformed bearer token", async () => {
		await request(app.getHttpServer())
			.get("/api/v1/groups")
			.set("Authorization", "Bearer malformed-token")
			.expect(401);
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
				members: [
					{
						id: expect.any(String),
						displayName: "Development User",
						email: "dev@cuentasclaras.local",
						isCurrentUser: true,
						removedAt: null,
					},
					{
						id: expect.any(String),
						displayName: "Ana",
						email: "ana@example.com",
						isCurrentUser: false,
						removedAt: null,
					},
				],
				membersCount: 2,
				expensesCount: 0,
				totalAmount: 0,
				currentUserBalance: 0,
				expenses: [],
				balances: [],
				createdAt: expect.any(String),
				updatedAt: expect.any(String),
				archivedAt: null,
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

	it("POST /api/v1/groups keeps invited members pending even when their email belongs to an existing user", async () => {
		const invitedUser = await prisma.user.create({
			data: {
				name: "Ana Existing",
				email: "ana.existing@example.com",
				emailVerifiedAt: new Date(),
			},
		});

		const response = await request(app.getHttpServer())
			.post("/api/v1/groups")
			.send({
				name: "Linked Group",
				type: "friends",
				currency: "ARS",
				members: [
					{
						displayName: "Ana",
						email: " Ana.Existing@Example.COM ",
					},
				],
			})
			.expect(201);

		const invitedMember = await prisma.groupMember.findFirstOrThrow({
			where: {
				groupId: response.body.data.id,
				email: "ana.existing@example.com",
			},
		});

		expect(invitedMember).toMatchObject({
			userId: null,
			displayName: "Ana",
			email: "ana.existing@example.com",
		});
		expect(invitedUser.id).toEqual(expect.any(String));
		expect(mail.groupInvitationEmails).toHaveLength(1);
	});

	it("POST /api/v1/groups/invitations/accept links the pending member with a matching verified user", async () => {
		const createResponse = await request(app.getHttpServer())
			.post("/api/v1/groups")
			.send({
				name: "Invitation Group",
				type: "friends",
				currency: "ARS",
				members: [
					{
						displayName: "Invitee",
						email: "invitee@example.com",
					},
				],
			})
			.expect(201);
		const invitee = await prisma.user.create({
			data: {
				name: "Invitee",
				email: "invitee@example.com",
				emailVerifiedAt: new Date(),
			},
		});
		const token = extractToken(mail.groupInvitationEmails[0].invitationUrl);

		await request(app.getHttpServer())
			.post("/api/v1/groups/invitations/accept")
			.set(
				"Authorization",
				createBearerToken({ userId: invitee.id, email: invitee.email }),
			)
			.send({ token })
			.expect(204);

		const member = await prisma.groupMember.findFirstOrThrow({
			where: {
				groupId: createResponse.body.data.id,
				email: "invitee@example.com",
			},
		});
		const activeTokens = await prisma.groupInvitationToken.findMany({
			where: {
				groupMemberId: member.id,
				consumedAt: null,
			},
		});
		expect(member.userId).toBe(invitee.id);
		expect(activeTokens).toHaveLength(0);
	});

	it("POST /api/v1/groups/invitations/accept rejects a second use of the same token", async () => {
		await request(app.getHttpServer())
			.post("/api/v1/groups")
			.send({
				name: "Single Use Group",
				type: "friends",
				currency: "ARS",
				members: [
					{
						displayName: "Invitee",
						email: "single-use@example.com",
					},
				],
			})
			.expect(201);
		const invitee = await prisma.user.create({
			data: {
				name: "Invitee",
				email: "single-use@example.com",
				emailVerifiedAt: new Date(),
			},
		});
		const authorization = createBearerToken({
			userId: invitee.id,
			email: invitee.email,
		});
		const token = extractToken(mail.groupInvitationEmails[0].invitationUrl);

		await request(app.getHttpServer())
			.post("/api/v1/groups/invitations/accept")
			.set("Authorization", authorization)
			.send({ token })
			.expect(204);

		const response = await request(app.getHttpServer())
			.post("/api/v1/groups/invitations/accept")
			.set("Authorization", authorization)
			.send({ token })
			.expect(409);

		expect(response.body.error).toMatchObject({
			code: "GROUP_INVITATION_TOKEN_CONSUMED",
			statusCode: 409,
		});
	});

	it("PATCH /api/v1/groups invalidates older active invitation tokens for updated pending members", async () => {
		const createResponse = await request(app.getHttpServer())
			.post("/api/v1/groups")
			.send({
				name: "Update Invitation Group",
				type: "friends",
				currency: "ARS",
				members: [
					{
						displayName: "Invitee",
						email: "update-invitee@example.com",
					},
				],
			})
			.expect(201);

		await request(app.getHttpServer())
			.patch(`/api/v1/groups/${createResponse.body.data.id}`)
			.send({
				members: [
					{
						displayName: "Invitee",
						email: "update-invitee@example.com",
					},
				],
			})
			.expect(200);

		const member = await prisma.groupMember.findFirstOrThrow({
			where: {
				groupId: createResponse.body.data.id,
				email: "update-invitee@example.com",
			},
		});
		const tokens = await prisma.groupInvitationToken.findMany({
			where: { groupMemberId: member.id },
		});
		expect(mail.groupInvitationEmails).toHaveLength(2);
		expect(tokens.filter((token) => token.consumedAt === null)).toHaveLength(1);
	});

	it("POST /api/v1/auth/register keeps pending group members unlinked and hidden from the new user", async () => {
		const createResponse = await request(app.getHttpServer())
			.post("/api/v1/groups")
			.send({
				name: "Pending Invitation Group",
				type: "friends",
				currency: "ARS",
				members: [
					{
						displayName: "New Member",
						email: "new.member@example.com",
					},
				],
			})
			.expect(201);

		const pendingMemberBeforeRegistration =
			await prisma.groupMember.findFirstOrThrow({
				where: {
					groupId: createResponse.body.data.id,
					email: "new.member@example.com",
				},
			});
		expect(pendingMemberBeforeRegistration.userId).toBeNull();

		const registerResponse = await request(app.getHttpServer())
			.post("/api/v1/auth/register")
			.send({
				name: "New Member",
				email: "new.member@example.com",
				password: "SecureP4ss!",
			})
			.expect(201);

		const pendingMemberAfterRegistration =
			await prisma.groupMember.findFirstOrThrow({
				where: {
					groupId: createResponse.body.data.id,
					email: "new.member@example.com",
				},
			});
		expect(pendingMemberAfterRegistration.userId).toBeNull();

		await prisma.user.update({
			where: { email: "new.member@example.com" },
			data: { emailVerifiedAt: new Date() },
		});

		const listResponse = await request(app.getHttpServer())
			.get("/api/v1/groups")
			.set("Authorization", `Bearer ${registerResponse.body.data.accessToken}`)
			.expect(200);

		expect(listResponse.body.data).not.toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: createResponse.body.data.id,
				}),
			]),
		);
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
			currentUserBalance: 0,
			createdAt: expect.any(String),
			updatedAt: expect.any(String),
		});
	});

	it("GET /api/v1/groups returns the signed currentUserBalance for the authenticated user", async () => {
		const group = await prisma.group.create({
			data: {
				ownerUserId: DEV_USER_ID,
				name: "Viaje A Europa",
				currency: "ARS",
			},
		});

		const gaston = await prisma.groupMember.create({
			data: {
				groupId: group.id,
				userId: DEV_USER_ID,
				displayName: "Gaston",
				email: DEV_USER_EMAIL,
			},
		});

		const cami = await prisma.groupMember.create({
			data: {
				groupId: group.id,
				userId: null,
				displayName: "cami.iriso",
				email: "cami@example.com",
			},
		});

		// cami paid an expense split equally: Gaston owes cami 250670.
		const expense = await prisma.expense.create({
			data: {
				groupId: group.id,
				title: "Hotel",
				amount: "501340.00",
				currency: "ARS",
				paidByMemberId: cami.id,
				splitType: "EQUAL",
				expenseDate: new Date("2026-06-27T00:00:00.000Z"),
			},
		});

		await prisma.expenseSplit.createMany({
			data: [
				{
					expenseId: expense.id,
					memberId: cami.id,
					owedAmount: "250670.00",
					paidAmount: "501340.00",
					netAmount: "250670.00",
				},
				{
					expenseId: expense.id,
					memberId: gaston.id,
					owedAmount: "250670.00",
					paidAmount: "0.00",
					netAmount: "-250670.00",
				},
			],
		});

		const response = await request(app.getHttpServer())
			.get("/api/v1/groups")
			.expect(200);

		expect(response.body.data).toHaveLength(1);
		expect(response.body.data[0]).toMatchObject({
			id: group.id,
			name: "Viaje A Europa",
			currency: "ARS",
			currentUserBalance: -250670,
		});
	});

	it("GET /api/v1/groups returns a positive currentUserBalance when others owe the user", async () => {
		const group = await prisma.group.create({
			data: {
				ownerUserId: DEV_USER_ID,
				name: "Nuevo Grupo",
				currency: "ARS",
			},
		});

		const gaston = await prisma.groupMember.create({
			data: {
				groupId: group.id,
				userId: DEV_USER_ID,
				displayName: "Gaston",
				email: DEV_USER_EMAIL,
			},
		});

		const test = await prisma.groupMember.create({
			data: {
				groupId: group.id,
				userId: null,
				displayName: "test",
				email: "test@example.com",
			},
		});

		const expense = await prisma.expense.create({
			data: {
				groupId: group.id,
				title: "Dinner",
				amount: "1000.00",
				currency: "ARS",
				paidByMemberId: gaston.id,
				splitType: "EQUAL",
				expenseDate: new Date("2026-06-27T00:00:00.000Z"),
			},
		});

		await prisma.expenseSplit.createMany({
			data: [
				{
					expenseId: expense.id,
					memberId: gaston.id,
					owedAmount: "500.00",
					paidAmount: "1000.00",
					netAmount: "500.00",
				},
				{
					expenseId: expense.id,
					memberId: test.id,
					owedAmount: "500.00",
					paidAmount: "0.00",
					netAmount: "-500.00",
				},
			],
		});

		const response = await request(app.getHttpServer())
			.get("/api/v1/groups")
			.expect(200);

		expect(response.body.data).toHaveLength(1);
		expect(response.body.data[0]).toMatchObject({
			id: group.id,
			name: "Nuevo Grupo",
			currentUserBalance: 500,
		});
	});

	it("GET /api/v1/groups returns currentUserBalance 0 when the user is settled", async () => {
		const group = await prisma.group.create({
			data: {
				ownerUserId: DEV_USER_ID,
				name: "Settled Group",
				currency: "ARS",
			},
		});

		await prisma.groupMember.create({
			data: {
				groupId: group.id,
				userId: DEV_USER_ID,
				displayName: "Gaston",
				email: DEV_USER_EMAIL,
			},
		});

		const response = await request(app.getHttpServer())
			.get("/api/v1/groups")
			.expect(200);

		expect(response.body.data).toHaveLength(1);
		expect(response.body.data[0]).toMatchObject({
			id: group.id,
			currentUserBalance: 0,
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
		const updatedMember = members.find(
			(member) => member.id === existingToUpdate.id,
		);
		const removedMember = members.find(
			(member) => member.id === existingToRemove.id,
		);
		const reactivatedMember = members.find(
			(member) => member.id === removedToReactivate.id,
		);
		const newMember = members.find(
			(member) => member.email === "diego@example.com",
		);

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

	it("PATCH /api/v1/groups/:groupId keeps an existing email user pending until invitation acceptance", async () => {
		const invitedUser = await prisma.user.create({
			data: {
				name: "Invited Update User",
				email: "invited.update@example.com",
				emailVerifiedAt: new Date(),
			},
		});
		const group = await prisma.group.create({
			data: {
				ownerUserId: DEV_USER_ID,
				name: "Patch Linked Group",
				type: "FRIENDS",
				currency: "ARS",
			},
		});

		await prisma.groupMember.create({
			data: {
				groupId: group.id,
				userId: DEV_USER_ID,
				displayName: "Development User",
				email: DEV_USER_EMAIL,
			},
		});

		await request(app.getHttpServer())
			.patch(`/api/v1/groups/${group.id}`)
			.send({
				members: [
					{
						displayName: "Invited Update User",
						email: " Invited.Update@Example.COM ",
					},
				],
			})
			.expect(200);

		const linkedMember = await prisma.groupMember.findFirstOrThrow({
			where: {
				groupId: group.id,
				email: "invited.update@example.com",
			},
		});

		expect(linkedMember).toMatchObject({
			userId: null,
			displayName: "Invited Update User",
			email: "invited.update@example.com",
			removedAt: null,
		});

		const listResponse = await request(app.getHttpServer())
			.get("/api/v1/groups")
			.set(
				"Authorization",
				createBearerToken({
					userId: invitedUser.id,
					email: invitedUser.email,
				}),
			)
			.expect(200);

		expect(listResponse.body.data).not.toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: group.id,
				}),
			]),
		);
		expect(mail.groupInvitationEmails).toHaveLength(1);
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

class CapturingMailDelivery extends MailDeliveryPort {
	verificationEmails: VerificationEmailInput[] = [];
	groupInvitationEmails: GroupInvitationEmailInput[] = [];
	failVerification = false;
	failInvitation = false;

	async sendVerificationEmail(input: VerificationEmailInput): Promise<void> {
		this.verificationEmails.push(input);

		if (this.failVerification) {
			throw new Error("verification mail failed");
		}
	}

	async sendGroupInvitationEmail(
		input: GroupInvitationEmailInput,
	): Promise<void> {
		this.groupInvitationEmails.push(input);

		if (this.failInvitation) {
			throw new Error("invitation mail failed");
		}
	}

	clear(): void {
		this.verificationEmails = [];
		this.groupInvitationEmails = [];
		this.failVerification = false;
		this.failInvitation = false;
	}
}

function extractToken(url: string): string {
	const parsed = new URL(url);
	const token = parsed.searchParams.get("token");

	if (!token) {
		throw new Error("Expected token query parameter.");
	}

	return token;
}
