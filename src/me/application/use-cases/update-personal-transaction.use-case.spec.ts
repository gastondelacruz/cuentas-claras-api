import { Test, type TestingModule } from "@nestjs/testing";
import {
	AccountsRepository,
	type Account,
} from "../../domain/ports/accounts.repository";
import {
	PersonalTransactionsRepository,
	type PersonalTransaction,
} from "../../domain/ports/personal-transactions.repository";
import { BusinessException } from "../../../shared/exceptions/business.exception";
import { UpdatePersonalTransactionUseCase } from "./update-personal-transaction.use-case";

describe("UpdatePersonalTransactionUseCase", () => {
	let useCase: UpdatePersonalTransactionUseCase;
	let accountsRepository: {
		findByIdAndUserId: ReturnType<typeof vi.fn>;
	};
	let transactionsRepository: {
		findByIdAndUserId: ReturnType<typeof vi.fn>;
		update: ReturnType<typeof vi.fn>;
	};

	const existingTransaction: PersonalTransaction = {
		id: "tx-1",
		userId: "user-1",
		accountId: "account-1",
		accountName: "Cash",
		type: "expense",
		amount: 100,
		currency: "ARS",
		category: "Alimentación",
		occurredAt: new Date("2026-06-29T10:00:00.000Z"),
		note: null,
		createdAt: new Date("2026-06-29T10:00:00.000Z"),
		updatedAt: new Date("2026-06-29T10:00:00.000Z"),
	};

	const account: Account = {
		id: "account-2",
		userId: "user-1",
		name: "Bank",
		kind: "bank",
		currency: "ARS",
		isDefault: false,
		archivedAt: null,
		createdAt: new Date("2026-01-01T00:00:00.000Z"),
		updatedAt: new Date("2026-01-01T00:00:00.000Z"),
	};

	beforeEach(async () => {
		accountsRepository = {
			findByIdAndUserId: vi.fn(),
		};
		transactionsRepository = {
			findByIdAndUserId: vi.fn(),
			update: vi.fn(),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				UpdatePersonalTransactionUseCase,
				{
					provide: AccountsRepository,
					useValue: accountsRepository,
				},
				{
					provide: PersonalTransactionsRepository,
					useValue: transactionsRepository,
				},
			],
		}).compile();

		useCase = module.get(UpdatePersonalTransactionUseCase);
	});

	it("updates a transaction owned by the user", async () => {
		transactionsRepository.findByIdAndUserId.mockResolvedValue(existingTransaction);

		const updated: PersonalTransaction = {
			...existingTransaction,
			amount: 250,
			note: "Updated note",
			updatedAt: new Date("2026-06-30T10:00:00.000Z"),
		};
		transactionsRepository.update.mockResolvedValue(updated);

		const result = await useCase.execute({
			userId: "user-1",
			transactionId: "tx-1",
			amount: 250,
			note: "Updated note",
		});

		expect(result).toEqual(updated);
		expect(transactionsRepository.findByIdAndUserId).toHaveBeenCalledWith(
			"tx-1",
			"user-1",
		);
		expect(transactionsRepository.update).toHaveBeenCalledWith(
			"tx-1",
			"user-1",
			{
				amount: 250,
				note: "Updated note",
			},
		);
	});

	it("throws PERSONAL_TX_NOT_FOUND when the transaction does not exist or belongs to another user", async () => {
		transactionsRepository.findByIdAndUserId.mockResolvedValue(null);

		const rejection = useCase.execute({
			userId: "user-1",
			transactionId: "foreign-tx",
			amount: 250,
		});

		await expect(rejection).rejects.toBeInstanceOf(BusinessException);
		await expect(rejection).rejects.toMatchObject({
			code: "PERSONAL_TX_NOT_FOUND",
			statusCode: 404,
		});
		expect(transactionsRepository.update).not.toHaveBeenCalled();
	});

	it("throws PERSONAL_TX_NOT_FOUND when the persistence layer reports no owner-scoped row was updated", async () => {
		transactionsRepository.findByIdAndUserId.mockResolvedValue(existingTransaction);
		transactionsRepository.update.mockResolvedValue(null);

		await expect(
			useCase.execute({
				userId: "user-1",
				transactionId: "tx-1",
				amount: 250,
			}),
		).rejects.toMatchObject({
			code: "PERSONAL_TX_NOT_FOUND",
			statusCode: 404,
		});
	});

	it("verifies ownership of an updated accountId", async () => {
		transactionsRepository.findByIdAndUserId.mockResolvedValue(existingTransaction);
		accountsRepository.findByIdAndUserId.mockResolvedValue(account);
		transactionsRepository.update.mockResolvedValue({
			...existingTransaction,
			accountId: account.id,
			accountName: account.name,
		});

		await useCase.execute({
			userId: "user-1",
			transactionId: "tx-1",
			accountId: account.id,
		});

		expect(accountsRepository.findByIdAndUserId).toHaveBeenCalledWith(
			account.id,
			"user-1",
		);
		expect(transactionsRepository.update).toHaveBeenCalledWith(
			"tx-1",
			"user-1",
			{
				accountId: account.id,
			},
		);
	});

	it("throws PERSONAL_TX_ACCOUNT_NOT_FOUND when the updated account does not belong to the user", async () => {
		transactionsRepository.findByIdAndUserId.mockResolvedValue(existingTransaction);
		accountsRepository.findByIdAndUserId.mockResolvedValue(null);

		await expect(
			useCase.execute({
				userId: "user-1",
				transactionId: "tx-1",
				accountId: "foreign-account",
			}),
		).rejects.toMatchObject({
			code: "PERSONAL_TX_ACCOUNT_NOT_FOUND",
			statusCode: 404,
		});
		expect(transactionsRepository.update).not.toHaveBeenCalled();
	});

	it("validates the final type and category combination", async () => {
		transactionsRepository.findByIdAndUserId.mockResolvedValue(existingTransaction);

		await expect(
			useCase.execute({
				userId: "user-1",
				transactionId: "tx-1",
				type: "income",
			}),
		).rejects.toMatchObject({
			code: "PERSONAL_TX_CATEGORY_NOT_ALLOWED",
			statusCode: 400,
		});
	});
});
