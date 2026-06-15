import { Module } from "@nestjs/common";
import { GetMeSummaryUseCase } from "./application/use-cases/get-me-summary.use-case";
import { MeSummaryRepository } from "./domain/ports/me-summary.repository";
import { MeController } from "./infrastructure/http/me.controller";
import { PrismaMeSummaryRepository } from "./infrastructure/persistence/prisma-me-summary.repository";

@Module({
	controllers: [MeController],
	providers: [
		GetMeSummaryUseCase,
		PrismaMeSummaryRepository,
		{
			provide: MeSummaryRepository,
			useExisting: PrismaMeSummaryRepository,
		},
	],
})
export class MeModule {}
