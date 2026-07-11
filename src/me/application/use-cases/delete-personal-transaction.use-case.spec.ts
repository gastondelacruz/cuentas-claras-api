import { Test, type TestingModule } from "@nestjs/testing";
import { PersonalTransactionsRepository } from "../../domain/ports/personal-transactions.repository";
import { BusinessException } from "../../../shared/exceptions/business.exception";
import { DeletePersonalTransactionUseCase } from "./delete-personal-transaction.use-case";

describe("DeletePersonalTransactionUseCase", () => {
	let useCase: DeletePersonalTransactionUseCase;
	let transactionsRepository: {
		delete: ReturnType<typeof vi.fn>;
	};

	beforeEach(async () => {
		transactionsRepository = {
			delete: vi.fn(),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				DeletePersonalTransactionUseCase,
				{
					provide: PersonalTransactionsRepository,
					useValue: transactionsRepository,
				},
			],
		}).compile();

		useCase = module.get(DeletePersonalTransactionUseCase);
	});

	it("deletes a transaction owned by the user", async () => {
		transactionsRepository.delete.mockResolvedValue(true);

		await expect(
			useCase.execute({
				userId: "user-1",
				transactionId: "tx-1",
			}),
		).resolves.toBeUndefined();
		expect(transactionsRepository.delete).toHaveBeenCalledWith(
			"tx-1",
			"user-1",
		);
	});

	it("throws PERSONAL_TX_NOT_FOUND when the transaction does not exist or belongs to another user", async () => {
		transactionsRepository.delete.mockResolvedValue(false);

		await expect(
			useCase.execute({
				userId: "user-1",
				transactionId: "foreign-tx",
			}),
		).rejects.toMatchObject({
			code: "PERSONAL_TX_NOT_FOUND",
			message: "Personal transaction not found.",
			statusCode: 404,
		});
	});
});
