import {
	Body,
	Controller,
	Get,
	Param,
	ParseUUIDPipe,
	Post,
	Query,
} from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { CreateExpenseUseCase } from "../../application/use-cases/create-expense.use-case";
import { GetExpenseDetailUseCase } from "../../application/use-cases/get-expense-detail.use-case";
import { ListGroupExpensesUseCase } from "../../application/use-cases/list-group-expenses.use-case";
import { CreateExpenseRequestDto } from "./dto/create-expense-request.dto";
import { CreateExpenseResponseDto } from "./dto/create-expense-response.dto";
import { ListExpensesQueryDto } from "./dto/list-expenses-query.dto";
import { ListExpensesResponseDto } from "./dto/list-expenses-response.dto";
import { ExpenseMapper } from "./mappers/expense.mapper";

@ApiTags("expenses")
@Controller("api/v1/groups/:groupId/expenses")
export class ExpensesController {
	constructor(
		private readonly createExpenseUseCase: CreateExpenseUseCase,
		private readonly listGroupExpensesUseCase: ListGroupExpensesUseCase,
	) {}

	@Get()
	@ApiOkResponse()
	async list(
		@Param("groupId", ParseUUIDPipe) groupId: string,
		@Query() query: ListExpensesQueryDto,
	): Promise<ListExpensesResponseDto> {
		const page = await this.listGroupExpensesUseCase.execute({
			groupId,
			limit: query.limit,
			cursor: query.cursor,
		});
		return ExpenseMapper.toListResponseDto(page);
	}

	@Post()
	@ApiCreatedResponse()
	async create(
		@Param("groupId", ParseUUIDPipe) groupId: string,
		@Body() body: CreateExpenseRequestDto,
	): Promise<CreateExpenseResponseDto> {
		const input = ExpenseMapper.toInput(groupId, body);
		const expense = await this.createExpenseUseCase.execute(input);
		return ExpenseMapper.toCreateResponseDto(expense);
	}
}

@ApiTags("expenses")
@Controller("api/v1/expenses")
export class ExpenseDetailController {
	constructor(private readonly getExpenseDetailUseCase: GetExpenseDetailUseCase) {}

	@Get(":expenseId")
	@ApiOkResponse()
	async getById(
		@Param("expenseId", ParseUUIDPipe) expenseId: string,
	): Promise<CreateExpenseResponseDto> {
		const expense = await this.getExpenseDetailUseCase.execute(expenseId);
		return ExpenseMapper.toDetailResponseDto(expense);
	}
}
