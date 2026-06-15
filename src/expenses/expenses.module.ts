import { Module } from "@nestjs/common";
import { CreateExpenseUseCase } from "./application/use-cases/create-expense.use-case";
import { DeleteExpenseUseCase } from "./application/use-cases/delete-expense.use-case";
import { GetExpenseDetailUseCase } from "./application/use-cases/get-expense-detail.use-case";
import { ListGroupExpensesUseCase } from "./application/use-cases/list-group-expenses.use-case";
import { UpdateExpenseUseCase } from "./application/use-cases/update-expense.use-case";
import { ExpenseRepository } from "./domain/ports/expense.repository";
import {
	ExpenseDetailController,
	ExpensesController,
} from "./infrastructure/http/expenses.controller";
import { PrismaExpenseRepository } from "./infrastructure/persistence/prisma-expense.repository";

@Module({
	controllers: [ExpensesController, ExpenseDetailController],
	providers: [
		CreateExpenseUseCase,
		UpdateExpenseUseCase,
		DeleteExpenseUseCase,
		ListGroupExpensesUseCase,
		GetExpenseDetailUseCase,
		PrismaExpenseRepository,
		{
			provide: ExpenseRepository,
			useExisting: PrismaExpenseRepository,
		},
	],
})
export class ExpensesModule {}
