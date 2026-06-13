export type GroupMember = {
	id: string;
	displayName: string;
	email: string | null;
	isCurrentUser: boolean;
	removedAt: Date | null;
};

export type GroupExpense = {
	id: string;
	title: string;
	amount: string;
	currency: string;
	paidByMemberId: string;
	splitType: string;
	category: string | null;
	notes: string | null;
	expenseDate: Date;
	createdAt: Date;
	updatedAt: Date;
};

export type GroupBalance = {
	memberId: string;
	amount: string;
	currency: string;
};

export type GroupDetail = {
	id: string;
	name: string;
	description: string | null;
	currency: string;
	members: GroupMember[];
	expenses: GroupExpense[];
	balances: GroupBalance[];
	createdAt: Date;
	updatedAt: Date;
};
