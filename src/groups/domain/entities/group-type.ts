export const GROUP_TYPES = [
	"trip",
	"home",
	"couple",
	"friends",
	"event",
	"other",
] as const;

export type GroupType = (typeof GROUP_TYPES)[number];
