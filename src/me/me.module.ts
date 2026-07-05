import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { EmailVerifiedGuard } from "../auth/infrastructure/security/email-verified.guard";
import { CreatePersonalTransactionUseCase } from "./application/use-cases/create-personal-transaction.use-case";
import { GetMeSummaryUseCase } from "./application/use-cases/get-me-summary.use-case";
import { GetPersonalTransactionsSummaryUseCase } from "./application/use-cases/get-personal-transactions-summary.use-case";
import { ListMyAccountsUseCase } from "./application/use-cases/list-my-accounts.use-case";
import { ListPersonalTransactionsUseCase } from "./application/use-cases/list-personal-transactions.use-case";
import { UpdatePersonalTransactionUseCase } from "./application/use-cases/update-personal-transaction.use-case";
import { AccountsRepository } from "./domain/ports/accounts.repository";
import { MeSummaryRepository } from "./domain/ports/me-summary.repository";
import { PersonalTransactionsRepository } from "./domain/ports/personal-transactions.repository";
import { MeController } from "./infrastructure/http/me.controller";
import { PrismaAccountsRepository } from "./infrastructure/persistence/prisma-accounts.repository";
import { PrismaMeSummaryRepository } from "./infrastructure/persistence/prisma-me-summary.repository";
import { PrismaPersonalTransactionsRepository } from "./infrastructure/persistence/prisma-personal-transactions.repository";

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
