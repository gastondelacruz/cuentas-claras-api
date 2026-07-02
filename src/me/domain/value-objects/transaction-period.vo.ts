export const TRANSACTION_PERIODS = ["day", "week", "month", "year"] as const;

export type TransactionPeriod = (typeof TRANSACTION_PERIODS)[number];
