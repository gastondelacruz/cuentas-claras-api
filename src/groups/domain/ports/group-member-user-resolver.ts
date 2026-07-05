export abstract class GroupMemberUserResolver {
	abstract resolveByEmails(emails: string[]): Promise<Map<string, string>>;
}
