import { Injectable } from "@nestjs/common";
import {
	MeSummaryRepository,
	type MeSummary,
} from "../../domain/ports/me-summary.repository";
import {
	calculateActiveSince,
	calculateMeSummaryTotals,
} from "../services/me-summary-calculator";

@Injectable()
export class GetMeSummaryUseCase {
	constructor(private readonly meSummaryRepository: MeSummaryRepository) {}

	async execute(userId: string): Promise<MeSummary> {
		const rawInputs =
			await this.meSummaryRepository.getRawSummaryInputsForUser(userId);

		const totalsByCurrency = calculateMeSummaryTotals({
			paidExpenses: rawInputs.paidExpenses,
			splits: rawInputs.splits,
			settlements: rawInputs.settlements,
		});

		const activeSince = calculateActiveSince(rawInputs.memberships);

		return {
			totalGroups: rawInputs.totalGroups,
			totalExpenses: rawInputs.totalExpenses,
			totalsByCurrency,
			activeSince,
		};
	}
}
