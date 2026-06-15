import { Injectable } from "@nestjs/common";
import { DEV_USER_ID } from "../../../shared/constants/dev-user";
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

	async execute(): Promise<MeSummary> {
		const rawInputs =
			await this.meSummaryRepository.getRawSummaryInputsForUser(DEV_USER_ID);

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
