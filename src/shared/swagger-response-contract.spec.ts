import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { LogoutUseCase } from "../auth/application/use-cases/logout.use-case";
import { GetEmailVerificationStatusUseCase } from "../auth/application/use-cases/get-email-verification-status.use-case";
import { LoginUseCase } from "../auth/application/use-cases/login.use-case";
import { RefreshTokenUseCase } from "../auth/application/use-cases/refresh.use-case";
import { RegisterUseCase } from "../auth/application/use-cases/register.use-case";
import { ResendEmailVerificationUseCase } from "../auth/application/use-cases/resend-email-verification.use-case";
import { VerifyEmailUseCase } from "../auth/application/use-cases/verify-email.use-case";
import { AuthUserRepository } from "../auth/domain/ports/auth-user.repository";
import { AuthController } from "../auth/infrastructure/http/auth.controller";
import { CreateExpenseUseCase } from "../expenses/application/use-cases/create-expense.use-case";
import { DeleteExpenseUseCase } from "../expenses/application/use-cases/delete-expense.use-case";
import { GetExpenseDetailUseCase } from "../expenses/application/use-cases/get-expense-detail.use-case";
import { ListGroupExpensesUseCase } from "../expenses/application/use-cases/list-group-expenses.use-case";
import { UpdateExpenseUseCase } from "../expenses/application/use-cases/update-expense.use-case";
import {
	ExpenseDetailController,
	ExpensesController,
} from "../expenses/infrastructure/http/expenses.controller";
import { ArchiveGroupUseCase } from "../groups/application/use-cases/archive-group.use-case";
import { AcceptGroupInvitationUseCase } from "../groups/application/use-cases/accept-group-invitation.use-case";
import { CreateGroupUseCase } from "../groups/application/use-cases/create-group.use-case";
import { GetGroupBalancesUseCase } from "../groups/application/use-cases/get-group-balances.use-case";
import { GetGroupDetailUseCase } from "../groups/application/use-cases/get-group-detail.use-case";
import { GetGroupSettlementsUseCase } from "../groups/application/use-cases/get-group-settlements.use-case";
import { ListGroupsUseCase } from "../groups/application/use-cases/list-groups.use-case";
import { RecordSettlementPaymentUseCase } from "../groups/application/use-cases/record-settlement-payment.use-case";
import { UpdateGroupUseCase } from "../groups/application/use-cases/update-group.use-case";
import { GroupsController } from "../groups/infrastructure/http/groups.controller";
import { HealthController } from "../health/health.controller";
import { CreatePersonalTransactionUseCase } from "../me/application/use-cases/create-personal-transaction.use-case";
import { DeletePersonalTransactionUseCase } from "../me/application/use-cases/delete-personal-transaction.use-case";
import { GetMeSummaryUseCase } from "../me/application/use-cases/get-me-summary.use-case";
import { GetPersonalTransactionsSummaryUseCase } from "../me/application/use-cases/get-personal-transactions-summary.use-case";
import { ListMyAccountsUseCase } from "../me/application/use-cases/list-my-accounts.use-case";
import { ListPersonalTransactionsUseCase } from "../me/application/use-cases/list-personal-transactions.use-case";
import { UpdatePersonalTransactionUseCase } from "../me/application/use-cases/update-personal-transaction.use-case";
import { MeController } from "../me/infrastructure/http/me.controller";

type OpenApiSchema = {
	$ref?: string;
	allOf?: OpenApiSchema[];
	items?: OpenApiSchema;
	properties?: Record<string, OpenApiSchema>;
	required?: string[];
	type?: string;
};

type OpenApiParameter = {
	name: string;
	in: string;
	required?: boolean;
	description?: string;
	schema?: { enum?: string[]; example?: unknown; type?: string };
};

describe("global Swagger response contract", () => {
	let app: INestApplication;
	let document: ReturnType<typeof SwaggerModule.createDocument>;

	beforeAll(async () => {
		const executeMock = { execute: () => undefined };
		const moduleRef = await Test.createTestingModule({
			controllers: [
				AuthController,
				GroupsController,
				ExpensesController,
				ExpenseDetailController,
				HealthController,
				MeController,
			],
			providers: [
				{ provide: RegisterUseCase, useValue: executeMock },
				{ provide: LoginUseCase, useValue: executeMock },
				{ provide: RefreshTokenUseCase, useValue: executeMock },
				{ provide: LogoutUseCase, useValue: executeMock },
				{ provide: VerifyEmailUseCase, useValue: executeMock },
				{ provide: ResendEmailVerificationUseCase, useValue: executeMock },
				{ provide: GetEmailVerificationStatusUseCase, useValue: executeMock },
				{ provide: AuthUserRepository, useValue: { findById: () => null } },
				{ provide: CreateGroupUseCase, useValue: executeMock },
				{ provide: ListGroupsUseCase, useValue: executeMock },
				{ provide: GetGroupDetailUseCase, useValue: executeMock },
				{ provide: UpdateGroupUseCase, useValue: executeMock },
				{ provide: ArchiveGroupUseCase, useValue: executeMock },
				{ provide: AcceptGroupInvitationUseCase, useValue: executeMock },
				{ provide: GetGroupBalancesUseCase, useValue: executeMock },
				{ provide: GetGroupSettlementsUseCase, useValue: executeMock },
				{ provide: RecordSettlementPaymentUseCase, useValue: executeMock },
				{ provide: CreateExpenseUseCase, useValue: executeMock },
				{ provide: ListGroupExpensesUseCase, useValue: executeMock },
				{ provide: GetExpenseDetailUseCase, useValue: executeMock },
				{ provide: UpdateExpenseUseCase, useValue: executeMock },
				{ provide: DeleteExpenseUseCase, useValue: executeMock },
				{ provide: GetMeSummaryUseCase, useValue: executeMock },
				{
					provide: GetPersonalTransactionsSummaryUseCase,
					useValue: executeMock,
				},
				{ provide: ListMyAccountsUseCase, useValue: executeMock },
				{ provide: ListPersonalTransactionsUseCase, useValue: executeMock },
				{ provide: CreatePersonalTransactionUseCase, useValue: executeMock },
				{ provide: UpdatePersonalTransactionUseCase, useValue: executeMock },
				{ provide: DeletePersonalTransactionUseCase, useValue: executeMock },
			],
		}).compile();

		app = moduleRef.createNestApplication();
		document = SwaggerModule.createDocument(
			app,
			new DocumentBuilder().setTitle("Contract Test").build(),
		);
	});

	afterAll(async () => {
		await app.close();
	});

	it("documents auth success responses as data envelopes", () => {
		expectEnvelopeDataRef(
			"/api/v1/auth/register",
			"post",
			"201",
			"#/components/schemas/RegisterResponseDto",
		);
		expectEnvelopeDataRef(
			"/api/v1/auth/login",
			"post",
			"200",
			"#/components/schemas/RegisterResponseDto",
		);
		expectEnvelopeDataRef(
			"/api/v1/auth/refresh",
			"post",
			"200",
			"#/components/schemas/RefreshResponseDto",
		);
		expect(document.components?.schemas?.RegisterResponseDto).toMatchObject({
			required: ["accessToken", "refreshToken", "user"],
		});
		expect(
			responseSchema("/api/v1/auth/logout", "post", "204"),
		).toBeUndefined();
	});

	it("documents groups success responses as typed data envelopes", () => {
		expectEnvelopeDataRef(
			"/api/v1/groups",
			"post",
			"201",
			"#/components/schemas/CreateGroupResponseDto",
		);
		expectEnvelopeArrayDataRef(
			"/api/v1/groups",
			"get",
			"200",
			"#/components/schemas/CreateGroupResponseDto",
		);
		expectEnvelopeDataRef(
			"/api/v1/groups/{groupId}",
			"delete",
			"200",
			"#/components/schemas/CreateGroupResponseDto",
		);
		expectEnvelopeDataRef(
			"/api/v1/groups/{groupId}",
			"get",
			"200",
			"#/components/schemas/CreateGroupResponseDto",
		);
		expectEnvelopeDataRef(
			"/api/v1/groups/{groupId}/balances",
			"get",
			"200",
			"#/components/schemas/GroupBalancesResponseDto",
		);
		expectEnvelopeDataRef(
			"/api/v1/groups/{groupId}/settlements",
			"get",
			"200",
			"#/components/schemas/GroupSettlementsResponseDto",
		);
		expectEnvelopeDataRef(
			"/api/v1/groups/{groupId}/settlements",
			"post",
			"201",
			"#/components/schemas/RecordSettlementPaymentResponseDto",
		);
		expectEnvelopeDataRef(
			"/api/v1/groups/{groupId}",
			"patch",
			"200",
			"#/components/schemas/CreateGroupResponseDto",
		);
		expect(document.components?.schemas?.GroupBalanceDto).toMatchObject({
			required: ["memberId", "displayName", "balance", "currency"],
		});
	});

	it("documents expenses success responses as typed data envelopes", () => {
		expectEnvelopeDataRef(
			"/api/v1/groups/{groupId}/expenses",
			"get",
			"200",
			"#/components/schemas/ListExpensesResponseDto",
		);
		expectEnvelopeDataRef(
			"/api/v1/groups/{groupId}/expenses",
			"post",
			"201",
			"#/components/schemas/CreateExpenseResponseDto",
		);
		expectEnvelopeDataRef(
			"/api/v1/expenses/{expenseId}",
			"delete",
			"200",
			"#/components/schemas/DeleteExpenseResponseDto",
		);
		expectEnvelopeDataRef(
			"/api/v1/expenses/{expenseId}",
			"get",
			"200",
			"#/components/schemas/CreateExpenseResponseDto",
		);
		expectEnvelopeDataRef(
			"/api/v1/expenses/{expenseId}",
			"patch",
			"200",
			"#/components/schemas/CreateExpenseResponseDto",
		);
		expect(
			document.components?.schemas?.ExpenseParticipantResponseDto,
		).toMatchObject({
			required: [
				"memberId",
				"displayName",
				"owedAmount",
				"paidAmount",
				"netAmount",
			],
		});
	});

	it("documents me success responses as typed reusable data envelopes", () => {
		expectEnvelopeDataRef(
			"/api/v1/me/summary",
			"get",
			"200",
			"#/components/schemas/MeSummaryResponseDto",
		);
		expectEnvelopeDataRef(
			"/api/v1/me/accounts",
			"get",
			"200",
			"#/components/schemas/ListAccountsResponseDto",
		);
		expectEnvelopeDataRef(
			"/api/v1/me/personal-transactions/summary",
			"get",
			"200",
			"#/components/schemas/PersonalTransactionsSummaryResponseDto",
		);
		expectEnvelopeDataRef(
			"/api/v1/me/personal-transactions",
			"get",
			"200",
			"#/components/schemas/ListPersonalTransactionsResponseDto",
		);
		expectEnvelopeDataRef(
			"/api/v1/me/personal-transactions",
			"post",
			"201",
			"#/components/schemas/CreatePersonalTransactionResponseDto",
		);
		expectEnvelopeDataRef(
			"/api/v1/me/personal-transactions/{transactionId}",
			"patch",
			"200",
			"#/components/schemas/CreatePersonalTransactionResponseDto",
		);
		expect(
			responseSchema(
				"/api/v1/me/personal-transactions/{transactionId}",
				"delete",
				"204",
			),
		).toBeUndefined();
	});

	it("documents delete-personal-transaction path parameter and errors", () => {
		const operation =
			document.paths["/api/v1/me/personal-transactions/{transactionId}"]
				?.delete;

		expect(operation).toBeDefined();
		expect(operation?.security).toEqual([{ bearer: [] }]);
		expect(operation?.parameters).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					in: "path",
					name: "transactionId",
					required: true,
					description: expect.any(String),
				}),
			]),
		);
		expect(operation?.responses).toMatchObject({
			204: expect.any(Object),
			401: expect.any(Object),
			404: expect.any(Object),
		});
	});

	it("documents the update-personal-transaction request body, path parameter, and errors", () => {
		const operation =
			document.paths["/api/v1/me/personal-transactions/{transactionId}"]?.patch;
		const schema = document.components?.schemas
			?.UpdatePersonalTransactionRequestDto as OpenApiSchema | undefined;

		expect(operation).toBeDefined();
		expect(operation?.security).toEqual([{ bearer: [] }]);
		expect(operation?.parameters).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					in: "path",
					name: "transactionId",
					required: true,
					description: expect.any(String),
				}),
			]),
		);
		expect(
			operation?.requestBody?.content?.["application/json"]?.schema,
		).toEqual({
			$ref: "#/components/schemas/UpdatePersonalTransactionRequestDto",
		});
		expect(operation?.responses).toMatchObject({
			400: expect.any(Object),
			401: expect.any(Object),
			404: expect.any(Object),
		});

		expect(schema).toBeDefined();
		expect(schema?.required).toBeUndefined();
		const properties = schema?.properties ?? {};
		for (const key of [
			"type",
			"amount",
			"currency",
			"category",
			"accountId",
			"occurredAt",
			"note",
		]) {
			expect(properties[key]?.description, `${key} description`).toBeTruthy();
			expect(properties[key]?.example, `${key} example`).toBeDefined();
		}
		expect(
			(properties.type as OpenApiSchema & { enum?: string[] }).enum,
		).toEqual(["expense", "income"]);
	});

	it("documents personal-transactions query parameters with enums and descriptions", () => {
		const parameters = document.paths["/api/v1/me/personal-transactions"]?.get
			?.parameters as OpenApiParameter[] | undefined;

		expect(parameters).toBeDefined();

		const byName = new Map(
			(parameters ?? []).map((param) => [param.name, param]),
		);

		expect(byName.get("range")).toMatchObject({
			in: "query",
			schema: expect.objectContaining({
				enum: ["day", "week", "month", "year", "period"],
			}),
		});
		expect(byName.get("range")?.description).toBeTruthy();
		expect(byName.get("type")).toMatchObject({
			in: "query",
			required: false,
			schema: expect.objectContaining({ enum: ["expense", "income"] }),
		});
		expect(byName.get("from")).toMatchObject({ in: "query", required: false });
		expect(byName.get("from")?.description).toBeTruthy();
		expect(byName.get("to")).toMatchObject({ in: "query", required: false });
		expect(byName.get("to")?.description).toBeTruthy();
		expect(byName.get("cursor")).toMatchObject({
			in: "query",
			required: false,
		});
		expect(byName.get("cursor")?.description).toBeTruthy();
		expect(byName.get("limit")).toMatchObject({ in: "query", required: false });
		expect(byName.get("limit")?.description).toBeTruthy();
	});

	it("documents personal-transactions summary query parameters with enums and descriptions", () => {
		const parameters = document.paths[
			"/api/v1/me/personal-transactions/summary"
		]?.get?.parameters as OpenApiParameter[] | undefined;

		expect(parameters).toBeDefined();

		const byName = new Map(
			(parameters ?? []).map((param) => [param.name, param]),
		);

		expect(byName.get("range")).toMatchObject({
			in: "query",
			required: false,
			schema: expect.objectContaining({
				enum: ["day", "week", "month", "year", "period"],
			}),
		});
		expect(byName.get("range")?.description).toBeTruthy();
		expect(byName.get("from")).toMatchObject({ in: "query", required: false });
		expect(byName.get("from")?.description).toBeTruthy();
		expect(byName.get("to")).toMatchObject({ in: "query", required: false });
		expect(byName.get("to")?.description).toBeTruthy();
	});

	it("documents the create-personal-transaction request body with descriptions and examples", () => {
		const schema = document.components?.schemas
			?.CreatePersonalTransactionRequestDto as OpenApiSchema | undefined;

		expect(schema).toBeDefined();
		expect(schema?.required).toEqual(
			expect.arrayContaining([
				"type",
				"amount",
				"currency",
				"category",
				"occurredAt",
			]),
		);

		const properties = schema?.properties ?? {};
		for (const key of [
			"type",
			"amount",
			"currency",
			"category",
			"accountId",
			"occurredAt",
			"note",
		]) {
			expect(properties[key]?.description, `${key} description`).toBeTruthy();
			expect(properties[key]?.example, `${key} example`).toBeDefined();
		}

		expect(
			(properties.type as OpenApiSchema & { enum?: string[] }).enum,
		).toEqual(["expense", "income"]);
		expect(
			(properties.note as OpenApiSchema & { maxLength?: number }).maxLength,
		).toBe(200);
	});

	it("documents health as the same reusable data envelope", () => {
		expectEnvelopeDataRef(
			"/health",
			"get",
			"200",
			"#/components/schemas/HealthResponseDto",
		);
		expect(document.components?.schemas?.ApiResponseEnvelopeDto).toMatchObject({
			required: ["data"],
		});
	});

	function expectEnvelopeDataRef(
		path: string,
		method: "get" | "post" | "patch" | "delete",
		status: string,
		dataRef: string,
	): void {
		expect(responseSchema(path, method, status)).toMatchObject({
			allOf: [
				{ $ref: "#/components/schemas/ApiResponseEnvelopeDto" },
				{ properties: { data: { $ref: dataRef } } },
			],
		});
	}

	function expectEnvelopeArrayDataRef(
		path: string,
		method: "get" | "post" | "patch" | "delete",
		status: string,
		itemRef: string,
	): void {
		expect(responseSchema(path, method, status)).toMatchObject({
			allOf: [
				{ $ref: "#/components/schemas/ApiResponseEnvelopeDto" },
				{
					properties: {
						data: {
							type: "array",
							items: { $ref: itemRef },
						},
					},
				},
			],
		});
	}

	function responseSchema(
		path: string,
		method: "get" | "post" | "patch" | "delete",
		status: string,
	): OpenApiSchema | undefined {
		const schema = document.paths[path]?.[method]?.responses?.[status]
			?.content?.["application/json"]?.schema as OpenApiSchema | undefined;

		return schema;
	}
});
