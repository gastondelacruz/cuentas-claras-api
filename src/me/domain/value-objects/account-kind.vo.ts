export const ACCOUNT_KINDS = ["cash", "bank", "credit"] as const;

export type AccountKind = (typeof ACCOUNT_KINDS)[number];
