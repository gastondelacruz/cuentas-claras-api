export const TRANSACTION_EXPENSE_KINDS = ["fixed", "variable"] as const;

export const DEFAULT_TRANSACTION_EXPENSE_KIND = "variable";

export type TransactionExpenseKind = (typeof TRANSACTION_EXPENSE_KINDS)[number];
