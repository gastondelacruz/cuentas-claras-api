export type MeSummaryCurrencyTotals = {
	currency: string;
	totalPaid: number;
	totalOwed: number;
	totalToReceive: number;
};

export type MeSummary = {
	totalGroups: number;
	totalExpenses: number;
	totalsByCurrency: MeSummaryCurrencyTotals[];
	activeSince: Date | null;
};

export type MeSummaryRawMembership = {
	createdAt: Date;
};

export type MeSummaryRawPaidExpense = {
	currency: string;
	amount: number;
};

export type MeSummaryRawSplit = {
	currency: string;
	netAmount: number;
};

export type MeSummaryRawSettlement = {
	currency: string;
	amount: number;
	direction: "incoming" | "outgoing";
};

export type MeSummaryRawInputs = {
	totalGroups: number;
	totalExpenses: number;
	memberships: MeSummaryRawMembership[];
	paidExpenses: MeSummaryRawPaidExpense[];
	splits: MeSummaryRawSplit[];
	settlements: MeSummaryRawSettlement[];
};

export abstract class MeSummaryRepository {
	abstract getRawSummaryInputsForUser(userId: string): Promise<MeSummaryRawInputs>;
}
