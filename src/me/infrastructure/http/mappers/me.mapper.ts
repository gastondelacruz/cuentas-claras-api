import type { MeSummary } from "../../../domain/ports/me-summary.repository";
import type { MeSummaryResponseDto } from "../dto/me-summary-response.dto";

export class MeMapper {
	static toSummaryResponseDto(summary: MeSummary): MeSummaryResponseDto {
		return {
			totalGroups: summary.totalGroups,
			totalExpenses: summary.totalExpenses,
			totalsByCurrency: summary.totalsByCurrency.map((totals) => ({
				currency: totals.currency,
				totalPaid: totals.totalPaid,
				totalOwed: totals.totalOwed,
				totalToReceive: totals.totalToReceive,
			})),
			activeSince: summary.activeSince?.toISOString() ?? null,
		};
	}
}
