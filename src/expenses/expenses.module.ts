import { Module } from "@nestjs/common";
import { CreateExpenseUseCase } from "./application/use-cases/create-expense.use-case";
import { ExpenseRepository } from "./domain/ports/expense.repository";
import { ExpensesController } from "./infrastructure/http/expenses.controller";
import { PrismaExpenseRepository } from "./infrastructure/persistence/prisma-expense.repository";

@Module({
	controllers: [ExpensesController],
	providers: [
		CreateExpenseUseCase,
		PrismaExpenseRepository,
		{
			provide: ExpenseRepository,
			useExisting: PrismaExpenseRepository,
		},
	],
})
export class ExpensesModule {}
