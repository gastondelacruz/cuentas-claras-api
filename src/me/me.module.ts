import { Module } from "@nestjs/common";
import { CreatePersonalTransactionUseCase } from "./application/use-cases/create-personal-transaction.use-case";
import { GetMeSummaryUseCase } from "./application/use-cases/get-me-summary.use-case";
import { ListMyAccountsUseCase } from "./application/use-cases/list-my-accounts.use-case";
import { ListPersonalTransactionsUseCase } from "./application/use-cases/list-personal-transactions.use-case";
import { AccountsRepository } from "./domain/ports/accounts.repository";
import { MeSummaryRepository } from "./domain/ports/me-summary.repository";
import { PersonalTransactionsRepository } from "./domain/ports/personal-transactions.repository";
import { MeController } from "./infrastructure/http/me.controller";
import { PrismaAccountsRepository } from "./infrastructure/persistence/prisma-accounts.repository";
import { PrismaMeSummaryRepository } from "./infrastructure/persistence/prisma-me-summary.repository";
import { PrismaPersonalTransactionsRepository } from "./infrastructure/persistence/prisma-personal-transactions.repository";

@Module({
	controllers: [MeController],
	providers: [
		GetMeSummaryUseCase,
		ListMyAccountsUseCase,
		ListPersonalTransactionsUseCase,
		CreatePersonalTransactionUseCase,
		PrismaMeSummaryRepository,
		PrismaAccountsRepository,
		PrismaPersonalTransactionsRepository,
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
	],
})
export class MeModule {}
