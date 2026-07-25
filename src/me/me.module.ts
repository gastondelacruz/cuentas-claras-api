import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { EmailVerifiedGuard } from "../auth/infrastructure/security/email-verified.guard";
import { CreatePersonalTransactionUseCase } from "./application/use-cases/create-personal-transaction.use-case";
import {
	CreatePersonalCategoryUseCase,
	ListPersonalCategoriesUseCase,
	UpdatePersonalCategoryUseCase,
} from "./application/use-cases/personal-categories.use-cases";
import { DeletePersonalTransactionUseCase } from "./application/use-cases/delete-personal-transaction.use-case";
import { GetMeSummaryUseCase } from "./application/use-cases/get-me-summary.use-case";
import { GetPersonalTransactionsSummaryUseCase } from "./application/use-cases/get-personal-transactions-summary.use-case";
import { ListMyAccountsUseCase } from "./application/use-cases/list-my-accounts.use-case";
import { ListPersonalTransactionsUseCase } from "./application/use-cases/list-personal-transactions.use-case";
import { UpdatePersonalTransactionUseCase } from "./application/use-cases/update-personal-transaction.use-case";
import { AccountsRepository } from "./domain/ports/accounts.repository";
import { MeSummaryRepository } from "./domain/ports/me-summary.repository";
import { PersonalTransactionsRepository } from "./domain/ports/personal-transactions.repository";
import { PersonalCategoriesRepository } from "./domain/ports/personal-categories.repository";
import { MeController } from "./infrastructure/http/me.controller";
import { PrismaAccountsRepository } from "./infrastructure/persistence/prisma-accounts.repository";
import { PrismaMeSummaryRepository } from "./infrastructure/persistence/prisma-me-summary.repository";
import { PrismaPersonalTransactionsRepository } from "./infrastructure/persistence/prisma-personal-transactions.repository";
import { PrismaPersonalCategoriesRepository } from "./infrastructure/persistence/prisma-personal-categories.repository";

@Module({
	imports: [AuthModule],
	controllers: [MeController],
	providers: [
		EmailVerifiedGuard,
		GetMeSummaryUseCase,
		ListMyAccountsUseCase,
		ListPersonalTransactionsUseCase,
		GetPersonalTransactionsSummaryUseCase,
		CreatePersonalTransactionUseCase,
		UpdatePersonalTransactionUseCase,
		DeletePersonalTransactionUseCase,
		ListPersonalCategoriesUseCase,
		CreatePersonalCategoryUseCase,
		UpdatePersonalCategoryUseCase,
		PrismaMeSummaryRepository,
		PrismaAccountsRepository,
		PrismaPersonalTransactionsRepository,
		PrismaPersonalCategoriesRepository,
		{
			provide: MeSummaryRepository,
			useExisting: PrismaMeSummaryRepository,
		},
		{
			provide: AccountsRepository,
			useExisting: PrismaAccountsRepository,
		},
		{
			provide: PersonalTransactionsRepository,
			useExisting: PrismaPersonalTransactionsRepository,
		},
		{
			provide: PersonalCategoriesRepository,
			useExisting: PrismaPersonalCategoriesRepository,
		},
	],
})
export class MeModule {}
