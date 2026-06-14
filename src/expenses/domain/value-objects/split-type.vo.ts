export const SPLIT_TYPES = ["equal"] as const;

export type SplitType = (typeof SPLIT_TYPES)[number];
