import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	ParseUUIDPipe,
	Patch,
	Post,
	Query,
} from "@nestjs/common";
import {
	ApiBearerAuth,
	ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "../../../shared/decorators/current-user.decorator";
import {
	ApiCreatedDataResponse,
	ApiOkDataResponse,
} from "../../../shared/swagger/api-envelope-response.decorator";
import { CreateExpenseUseCase } from "../../application/use-cases/create-expense.use-case";
import { DeleteExpenseUseCase } from "../../application/use-cases/delete-expense.use-case";
import { GetExpenseDetailUseCase } from "../../application/use-cases/get-expense-detail.use-case";
import { ListGroupExpensesUseCase } from "../../application/use-cases/list-group-expenses.use-case";
import { UpdateExpenseUseCase } from "../../application/use-cases/update-expense.use-case";
import { CreateExpenseRequestDto } from "./dto/create-expense-request.dto";
import {
	CreateExpenseResponseDto,
} from "./dto/create-expense-response.dto";
import { DeleteExpenseResponseDto } from "./dto/delete-expense-response.dto";
import { ListExpensesQueryDto } from "./dto/list-expenses-query.dto";
import { ListExpensesResponseDto } from "./dto/list-expenses-response.dto";
import { UpdateExpenseRequestDto } from "./dto/update-expense-request.dto";
import { ExpenseMapper } from "./mappers/expense.mapper";

@ApiTags("expenses")
@ApiBearerAuth()
@Controller("api/v1/groups/:groupId/expenses")
export class ExpensesController {
	constructor(
		private readonly createExpenseUseCase: CreateExpenseUseCase,
		private readonly listGroupExpensesUseCase: ListGroupExpensesUseCase,
	) {}

	@Get()
	@ApiOkDataResponse({ type: ListExpensesResponseDto })
	async list(
		@CurrentUser("userId") userId: string,
		@Param("groupId", ParseUUIDPipe) groupId: string,
		@Query() query: ListExpensesQueryDto,
	): Promise<ListExpensesResponseDto> {
		const page = await this.listGroupExpensesUseCase.execute(userId, {
			groupId,
			limit: query.limit,
			cursor: query.cursor,
		});
		return ExpenseMapper.toListResponseDto(page);
	}

	@Post()
	@ApiCreatedDataResponse({ type: CreateExpenseResponseDto })
	async create(
		@CurrentUser("userId") userId: string,
		@Param("groupId", ParseUUIDPipe) groupId: string,
		@Body() body: CreateExpenseRequestDto,
	): Promise<CreateExpenseResponseDto> {
		const input = ExpenseMapper.toInput(groupId, body);
		const expense = await this.createExpenseUseCase.execute(userId, input);
		return ExpenseMapper.toCreateResponseDto(expense);
	}
}

@ApiTags("expenses")
@ApiBearerAuth()
@Controller("api/v1/expenses")
export class ExpenseDetailController {
	constructor(
		private readonly getExpenseDetailUseCase: GetExpenseDetailUseCase,
		private readonly updateExpenseUseCase: UpdateExpenseUseCase,
		private readonly deleteExpenseUseCase: DeleteExpenseUseCase,
	) {}

	@Get(":expenseId")
	@ApiOkDataResponse({ type: CreateExpenseResponseDto })
	async getById(
		@CurrentUser("userId") userId: string,
		@Param("expenseId", ParseUUIDPipe) expenseId: string,
	): Promise<CreateExpenseResponseDto> {
		const expense = await this.getExpenseDetailUseCase.execute(userId, expenseId);
		return ExpenseMapper.toDetailResponseDto(expense);
	}

	@Patch(":expenseId")
	@ApiOkDataResponse({ type: CreateExpenseResponseDto })
	async update(
		@CurrentUser("userId") userId: string,
		@Param("expenseId", ParseUUIDPipe) expenseId: string,
		@Body() body: UpdateExpenseRequestDto,
	): Promise<CreateExpenseResponseDto> {
		const input = ExpenseMapper.toUpdateInput(expenseId, body);
		const expense = await this.updateExpenseUseCase.execute(userId, input);
		return ExpenseMapper.toDetailResponseDto(expense);
	}

	@Delete(":expenseId")
	@ApiOkDataResponse({ type: DeleteExpenseResponseDto })
	async delete(
		@CurrentUser("userId") userId: string,
		@Param("expenseId", ParseUUIDPipe) expenseId: string,
	): Promise<DeleteExpenseResponseDto> {
		const deleted = await this.deleteExpenseUseCase.execute(userId, expenseId);
		return ExpenseMapper.toDeleteResponseDto(deleted);
	}
}
