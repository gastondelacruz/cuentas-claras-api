import { Test, type TestingModule } from "@nestjs/testing";
import {
	MeSummaryRepository,
	type MeSummaryRawInputs,
} from "../../domain/ports/me-summary.repository";
import { GetMeSummaryUseCase } from "./get-me-summary.use-case";

describe("GetMeSummaryUseCase", () => {
	let useCase: GetMeSummaryUseCase;
	let repository: {
		getRawSummaryInputsForUser: ReturnType<typeof vi.fn>;
	};

	beforeEach(async () => {
		repository = {
			getRawSummaryInputsForUser: vi.fn(),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				GetMeSummaryUseCase,
				{
					provide: MeSummaryRepository,
					useValue: repository,
				},
			],
		}).compile();

		useCase = module.get(GetMeSummaryUseCase);
	});

	it("returns an empty summary when the user has no active memberships", async () => {
		const rawInputs: MeSummaryRawInputs = {
			totalGroups: 0,
			totalExpenses: 0,
			memberships: [],
			paidExpenses: [],
			splits: [],
			settlements: [],
		};

		repository.getRawSummaryInputsForUser.mockResolvedValue(rawInputs);

		await expect(useCase.execute("user-1")).resolves.toEqual({
			totalGroups: 0,
			totalExpenses: 0,
			totalsByCurrency: [],
			activeSince: null,
		});
		expect(repository.getRawSummaryInputsForUser).toHaveBeenCalledWith(
			"user-1",
		);
	});

	it("computes the full summary from raw inputs for the authenticated user", async () => {
		const activeSince = new Date("2026-01-05T00:00:00.000Z");
		const laterMembership = new Date("2026-02-01T00:00:00.000Z");

		const rawInputs: MeSummaryRawInputs = {
			totalGroups: 2,
			totalExpenses: 3,
			memberships: [{ createdAt: laterMembership }, { createdAt: activeSince }],
			paidExpenses: [{ currency: "ARS", amount: 100000 }],
			splits: [{ currency: "ARS", netAmount: 50000 }],
			settlements: [{ currency: "ARS", amount: 10000, direction: "incoming" }],
		};

		repository.getRawSummaryInputsForUser.mockResolvedValue(rawInputs);

		await expect(useCase.execute("user-1")).resolves.toEqual({
			totalGroups: 2,
			totalExpenses: 3,
			totalsByCurrency: [
				{
					currency: "ARS",
					totalPaid: 100000,
					totalOwed: 0,
					totalToReceive: 40000,
				},
			],
			activeSince,
		});
		expect(repository.getRawSummaryInputsForUser).toHaveBeenCalledWith(
			"user-1",
		);
	});
});
