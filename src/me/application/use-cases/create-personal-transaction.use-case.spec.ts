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
import { CreatePersonalTransactionUseCase } from "./create-personal-transaction.use-case";

describe("CreatePersonalTransactionUseCase", () => {
	let useCase: CreatePersonalTransactionUseCase;
	let accountsRepository: {
		findDefaultByUserId: ReturnType<typeof vi.fn>;
		findByIdAndUserId: ReturnType<typeof vi.fn>;
	};
	let transactionsRepository: {
		create: ReturnType<typeof vi.fn>;
	};

	const defaultAccount: Account = {
		id: "account-1",
		userId: "user-1",
		name: "Cash",
		kind: "cash",
		currency: "ARS",
		isDefault: true,
		archivedAt: null,
		createdAt: new Date("2026-01-01T00:00:00.000Z"),
		updatedAt: new Date("2026-01-01T00:00:00.000Z"),
	};

	beforeEach(async () => {
		accountsRepository = {
			findDefaultByUserId: vi.fn(),
			findByIdAndUserId: vi.fn(),
		};
		transactionsRepository = {
			create: vi.fn(),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				CreatePersonalTransactionUseCase,
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

		useCase = module.get(CreatePersonalTransactionUseCase);
	});

	it("creates a transaction using the default account when accountId is omitted", async () => {
		accountsRepository.findDefaultByUserId.mockResolvedValue(defaultAccount);

		const created: PersonalTransaction = {
			id: "tx-1",
			userId: "user-1",
			accountId: defaultAccount.id,
			accountName: defaultAccount.name,
			type: "expense",
			expenseKind: "variable",
			amount: 100,
			currency: "ARS",
			category: "Alimentación",
			occurredAt: new Date("2026-06-29T10:00:00.000Z"),
			note: null,
			createdAt: new Date("2026-06-29T10:00:00.000Z"),
			updatedAt: new Date("2026-06-29T10:00:00.000Z"),
		};
		transactionsRepository.create.mockResolvedValue(created);

		const result = await useCase.execute({
			userId: "user-1",
			type: "expense",
			amount: 100,
			currency: "ARS",
			category: "Alimentación",
			occurredAt: new Date("2026-06-29T10:00:00.000Z"),
		});

		expect(result).toEqual(created);
		expect(accountsRepository.findDefaultByUserId).toHaveBeenCalledWith(
			"user-1",
		);
		expect(transactionsRepository.create).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: "user-1",
				accountId: defaultAccount.id,
				expenseKind: "variable",
			}),
		);
	});

	it("passes an explicit fixed expense kind for expense transactions", async () => {
		accountsRepository.findDefaultByUserId.mockResolvedValue(defaultAccount);

		const created: PersonalTransaction = {
			id: "tx-1",
			userId: "user-1",
			accountId: defaultAccount.id,
			accountName: defaultAccount.name,
			type: "expense",
			expenseKind: "fixed",
			amount: 100,
			currency: "ARS",
			category: "Alimentación",
			occurredAt: new Date("2026-06-29T10:00:00.000Z"),
			note: null,
			createdAt: new Date("2026-06-29T10:00:00.000Z"),
			updatedAt: new Date("2026-06-29T10:00:00.000Z"),
		};
		transactionsRepository.create.mockResolvedValue(created);

		const result = await useCase.execute({
			userId: "user-1",
			type: "expense",
			expenseKind: "fixed",
			amount: 100,
			currency: "ARS",
			category: "Alimentación",
			occurredAt: new Date("2026-06-29T10:00:00.000Z"),
		});

		expect(result).toEqual(created);
		expect(transactionsRepository.create).toHaveBeenCalledWith(
			expect.objectContaining({
				expenseKind: "fixed",
			}),
		);
	});

	it("uses the explicit accountId after verifying ownership", async () => {
		accountsRepository.findByIdAndUserId.mockResolvedValue(defaultAccount);

		const created: PersonalTransaction = {
			id: "tx-1",
			userId: "user-1",
			accountId: "account-1",
			accountName: defaultAccount.name,
			type: "income",
			expenseKind: null,
			amount: 500,
			currency: "ARS",
			category: "Salario",
			occurredAt: new Date("2026-06-29T10:00:00.000Z"),
			note: "Salary",
			createdAt: new Date("2026-06-29T10:00:00.000Z"),
			updatedAt: new Date("2026-06-29T10:00:00.000Z"),
		};
		transactionsRepository.create.mockResolvedValue(created);

		const result = await useCase.execute({
			userId: "user-1",
			accountId: "account-1",
			type: "income",
			amount: 500,
			currency: "ARS",
			category: "Salario",
			occurredAt: new Date("2026-06-29T10:00:00.000Z"),
			note: "Salary",
		});

		expect(result).toEqual(created);
		expect(accountsRepository.findByIdAndUserId).toHaveBeenCalledWith(
			"account-1",
			"user-1",
		);
		expect(transactionsRepository.create).toHaveBeenCalledWith(
			expect.objectContaining({
				expenseKind: null,
			}),
		);
	});

	it("throws PERSONAL_TX_EXPENSE_KIND_NOT_ALLOWED when expenseKind is sent for income", async () => {
		await expect(
			useCase.execute({
				userId: "user-1",
				accountId: "account-1",
				type: "income",
				expenseKind: "fixed",
				amount: 100,
				currency: "ARS",
				category: "Salario",
				occurredAt: new Date("2026-06-29T10:00:00.000Z"),
			}),
		).rejects.toMatchObject({
			code: "PERSONAL_TX_EXPENSE_KIND_NOT_ALLOWED",
			statusCode: 400,
		});
	});

	it("throws PERSONAL_TX_CATEGORY_NOT_ALLOWED when category does not match type", async () => {
		await expect(
			useCase.execute({
				userId: "user-1",
				accountId: "account-1",
				type: "expense",
				amount: 100,
				currency: "ARS",
				category: "Salario",
				occurredAt: new Date("2026-06-29T10:00:00.000Z"),
			}),
		).rejects.toThrow(BusinessException);

		await expect(
			useCase.execute({
				userId: "user-1",
				accountId: "account-1",
				type: "expense",
				amount: 100,
				currency: "ARS",
				category: "Salario",
				occurredAt: new Date("2026-06-29T10:00:00.000Z"),
			}),
		).rejects.toMatchObject({
			code: "PERSONAL_TX_CATEGORY_NOT_ALLOWED",
			statusCode: 400,
		});
	});

	it("throws PERSONAL_TX_ACCOUNT_NOT_FOUND when the account does not exist or belongs to another user", async () => {
		accountsRepository.findByIdAndUserId.mockResolvedValue(null);

		await expect(
			useCase.execute({
				userId: "user-1",
				accountId: "account-2",
				type: "expense",
				amount: 100,
				currency: "ARS",
				category: "Alimentación",
				occurredAt: new Date("2026-06-29T10:00:00.000Z"),
			}),
		).rejects.toMatchObject({
			code: "PERSONAL_TX_ACCOUNT_NOT_FOUND",
			statusCode: 404,
		});
	});

	it("throws PERSONAL_TX_NO_DEFAULT_ACCOUNT when accountId is omitted and there is no default", async () => {
		accountsRepository.findDefaultByUserId.mockResolvedValue(null);

		await expect(
			useCase.execute({
				userId: "user-1",
				type: "expense",
				amount: 100,
				currency: "ARS",
				category: "Alimentación",
				occurredAt: new Date("2026-06-29T10:00:00.000Z"),
			}),
		).rejects.toMatchObject({
			code: "PERSONAL_TX_NO_DEFAULT_ACCOUNT",
			statusCode: 400,
		});
	});
});
