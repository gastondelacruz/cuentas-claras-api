import {
	BadRequestException,
	Body,
	Controller,
	Get,
	Param,
	ParseUUIDPipe,
	Patch,
	Post,
	Query,
	UseGuards,
} from "@nestjs/common";
import { EmailVerifiedGuard } from "../../../auth/infrastructure/security/email-verified.guard";
import {
	ApiBadRequestResponse,
	ApiBearerAuth,
	ApiBody,
	ApiNotFoundResponse,
	ApiParam,
	ApiUnauthorizedResponse,
	ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "../../../shared/decorators/current-user.decorator";
import {
	ApiCreatedDataResponse,
	ApiOkDataResponse,
} from "../../../shared/swagger/api-envelope-response.decorator";
// biome-ignore lint/style/useImportType: Nest uses this class as a runtime DI token.
import { CreatePersonalTransactionUseCase } from "../../application/use-cases/create-personal-transaction.use-case";
// biome-ignore lint/style/useImportType: Nest uses this class as a runtime DI token.
import { GetMeSummaryUseCase } from "../../application/use-cases/get-me-summary.use-case";
// biome-ignore lint/style/useImportType: Nest uses this class as a runtime DI token.
import { GetPersonalTransactionsSummaryUseCase } from "../../application/use-cases/get-personal-transactions-summary.use-case";
// biome-ignore lint/style/useImportType: Nest uses this class as a runtime DI token.
import { ListMyAccountsUseCase } from "../../application/use-cases/list-my-accounts.use-case";
// biome-ignore lint/style/useImportType: Nest uses this class as a runtime DI token.
import { ListPersonalTransactionsUseCase } from "../../application/use-cases/list-personal-transactions.use-case";
// biome-ignore lint/style/useImportType: Nest uses this class as a runtime DI token.
import { UpdatePersonalTransactionUseCase } from "../../application/use-cases/update-personal-transaction.use-case";
import type { TransactionExpenseKind } from "../../domain/value-objects/transaction-expense-kind.vo";
import type { TransactionPeriod } from "../../domain/value-objects/transaction-period.vo";
import type { TransactionType } from "../../domain/value-objects/transaction-type.vo";
import { ListAccountsResponseDto } from "./dto/list-accounts-response.dto";
// biome-ignore lint/style/useImportType: Swagger/Nest reads this DTO at runtime for body metadata.
import { CreatePersonalTransactionRequestDto } from "./dto/create-personal-transaction-request.dto";
import { CreatePersonalTransactionResponseDto } from "./dto/create-personal-transaction-response.dto";
// biome-ignore lint/style/useImportType: Swagger/Nest reads this DTO at runtime for query metadata.
import { ListPersonalTransactionsQueryDto } from "./dto/list-personal-transactions-query.dto";
import {
	ListPersonalTransactionsResponseDto,
} from "./dto/list-personal-transactions-response.dto";
import { MeSummaryResponseDto } from "./dto/me-summary-response.dto";
// biome-ignore lint/style/useImportType: Swagger/Nest reads this DTO at runtime for query metadata.
import { PersonalTransactionsSummaryQueryDto } from "./dto/personal-transactions-summary-query.dto";
import { PersonalTransactionsSummaryResponseDto } from "./dto/personal-transactions-summary-response.dto";
import { UpdatePersonalTransactionRequestDto } from "./dto/update-personal-transaction-request.dto";
import { AccountsMapper } from "./mappers/accounts.mapper";
import { MeMapper } from "./mappers/me.mapper";
import { PersonalTransactionsMapper } from "./mappers/personal-transactions.mapper";

@ApiTags("me")
@ApiBearerAuth()
@UseGuards(EmailVerifiedGuard)
@Controller("api/v1/me")
export class MeController {
	constructor(
		private readonly getMeSummaryUseCase: GetMeSummaryUseCase,
		private readonly listMyAccountsUseCase: ListMyAccountsUseCase,
		private readonly listPersonalTransactionsUseCase: ListPersonalTransactionsUseCase,
		private readonly getPersonalTransactionsSummaryUseCase: GetPersonalTransactionsSummaryUseCase,
		private readonly createPersonalTransactionUseCase: CreatePersonalTransactionUseCase,
		private readonly updatePersonalTransactionUseCase: UpdatePersonalTransactionUseCase,
	) {}

	@Get("summary")
	@ApiOkDataResponse({ type: MeSummaryResponseDto })
	async getSummary(
		@CurrentUser("userId") userId: string,
	): Promise<MeSummaryResponseDto> {
		const summary = await this.getMeSummaryUseCase.execute(userId);
		return MeMapper.toSummaryResponseDto(summary);
	}

	@Get("accounts")
	@ApiOkDataResponse({ type: ListAccountsResponseDto })
	async listAccounts(
		@CurrentUser("userId") userId: string,
	): Promise<ListAccountsResponseDto> {
		const accounts = await this.listMyAccountsUseCase.execute(userId);
		return AccountsMapper.toResponseListDto(accounts);
	}

	@Get("personal-transactions")
	@ApiOkDataResponse({ type: ListPersonalTransactionsResponseDto })
	async listPersonalTransactions(
		@CurrentUser("userId") userId: string,
		@Query() query: ListPersonalTransactionsQueryDto,
	): Promise<ListPersonalTransactionsResponseDto> {
		const decodedCursor = query.cursor
			? PersonalTransactionsMapper.decodeCursor(query.cursor)
			: undefined;

		if (query.cursor && decodedCursor === undefined) {
			throw new BadRequestException({
				code: "PERSONAL_TX_INVALID_CURSOR",
				message: "Invalid cursor.",
			});
		}

		if (query.range === "period" && (!query.from || !query.to)) {
			throw new BadRequestException({
				code: "PERSONAL_TX_INVALID_PERIOD",
				message: 'Both "from" and "to" are required when range is "period".',
			});
		}

		const output = await this.listPersonalTransactionsUseCase.execute({
			userId,
			type: query.type as TransactionType | undefined,
			period:
				query.range === "period"
					? undefined
					: (query.range as TransactionPeriod),
			dateFrom: query.from ? new Date(query.from) : undefined,
			dateTo: query.to ? new Date(query.to) : undefined,
			limit: query.limit,
			cursor: decodedCursor,
		});

		return PersonalTransactionsMapper.toResponseListDto(output);
	}

	@Get("personal-transactions/summary")
	@ApiOkDataResponse({ type: PersonalTransactionsSummaryResponseDto })
	async getPersonalTransactionsSummary(
		@CurrentUser("userId") userId: string,
		@Query() query: PersonalTransactionsSummaryQueryDto,
	): Promise<PersonalTransactionsSummaryResponseDto> {
		this.validatePeriodQuery(query.range, query.from, query.to);

		const output = await this.getPersonalTransactionsSummaryUseCase.execute({
			userId,
			period:
				query.range === "period"
					? undefined
					: (query.range as TransactionPeriod),
			dateFrom: query.from ? new Date(query.from) : undefined,
			dateTo: query.to ? new Date(query.to) : undefined,
		});

		return PersonalTransactionsMapper.toSummaryResponseDto(output);
	}

	@Post("personal-transactions")
	@ApiCreatedDataResponse({ type: CreatePersonalTransactionResponseDto })
	async createPersonalTransaction(
		@CurrentUser("userId") userId: string,
		@Body() dto: CreatePersonalTransactionRequestDto,
	): Promise<CreatePersonalTransactionResponseDto> {
		const transaction = await this.createPersonalTransactionUseCase.execute({
			userId,
			accountId: dto.accountId,
			type: dto.type as TransactionType,
			expenseKind: dto.expenseKind as TransactionExpenseKind | undefined,
			amount: dto.amount,
			currency: dto.currency,
			category: dto.category,
			occurredAt: new Date(dto.occurredAt),
			note: dto.note,
		});

		return PersonalTransactionsMapper.toCreateResponseDto(transaction);
	}

	@Patch("personal-transactions/:transactionId")
	@ApiParam({
		name: "transactionId",
		description: "Personal transaction identifier.",
		example: "550e8400-e29b-41d4-a716-446655440000",
	})
	@ApiBody({ type: UpdatePersonalTransactionRequestDto })
	@ApiOkDataResponse({ type: CreatePersonalTransactionResponseDto })
	@ApiBadRequestResponse({
		description: "Invalid request body or category/type combination.",
	})
	@ApiUnauthorizedResponse({ description: "Authentication is required." })
	@ApiNotFoundResponse({
		description: "Personal transaction or account not found.",
	})
	async updatePersonalTransaction(
		@CurrentUser("userId") userId: string,
		@Param("transactionId", ParseUUIDPipe) transactionId: string,
		@Body() dto: UpdatePersonalTransactionRequestDto,
	): Promise<CreatePersonalTransactionResponseDto> {
		const transaction = await this.updatePersonalTransactionUseCase.execute({
			userId,
			transactionId,
			type: dto.type as TransactionType | undefined,
			expenseKind: dto.expenseKind as TransactionExpenseKind | undefined,
			amount: dto.amount,
			currency: dto.currency,
			category: dto.category,
			accountId: dto.accountId,
			occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : undefined,
			note: dto.note,
		});

		return PersonalTransactionsMapper.toUpdateResponseDto(transaction);
	}

	private validatePeriodQuery(
		range: string,
		from: string | undefined,
		to: string | undefined,
	): void {
		if (range === "period" && (!from || !to)) {
			throw new BadRequestException({
				code: "PERSONAL_TX_INVALID_PERIOD",
				message: 'Both "from" and "to" are required when range is "period".',
			});
		}

		if (from && to && new Date(from).getTime() > new Date(to).getTime()) {
			throw new BadRequestException({
				code: "PERSONAL_TX_INVALID_PERIOD",
				message: '"from" must be less than or equal to "to".',
			});
		}
	}
}
