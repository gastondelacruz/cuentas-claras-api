export type VerificationEmailInput = {
	to: string;
	name: string;
	verificationUrl: string;
};

export type PasswordResetEmailInput = {
	to: string;
	name: string;
	resetUrl: string;
};

export type GroupInvitationEmailInput = {
	to: string;
	inviteeName: string;
	groupName: string;
	invitationUrl: string;
};

export abstract class MailDeliveryPort {
	abstract sendVerificationEmail(input: VerificationEmailInput): Promise<void>;
	async sendPasswordResetEmail(_input: PasswordResetEmailInput): Promise<void> {
		return undefined;
	}
	abstract sendGroupInvitationEmail(
		input: GroupInvitationEmailInput,
	): Promise<void>;
}
