import { Body, Controller, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { ApiCreatedResponse, ApiTags } from "@nestjs/swagger";
import { CreateExpenseUseCase } from "../../application/use-cases/create-expense.use-case";
import { CreateExpenseRequestDto } from "./dto/create-expense-request.dto";
import { CreateExpenseResponseDto } from "./dto/create-expense-response.dto";
import { ExpenseMapper } from "./mappers/expense.mapper";

@ApiTags("expenses")
@Controller("api/v1/groups/:groupId/expenses")
export class ExpensesController {
	constructor(private readonly createExpenseUseCase: CreateExpenseUseCase) {}

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
