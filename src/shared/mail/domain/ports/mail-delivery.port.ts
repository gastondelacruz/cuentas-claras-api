export type VerificationEmailInput = {
	to: string;
	name: string;
	verificationUrl: string;
};

export type GroupInvitationEmailInput = {
	to: string;
	inviteeName: string;
	groupName: string;
	invitationUrl: string;
};

export abstract class MailDeliveryPort {
	abstract sendVerificationEmail(input: VerificationEmailInput): Promise<void>;
	abstract sendGroupInvitationEmail(input: GroupInvitationEmailInput): Promise<void>;
}
