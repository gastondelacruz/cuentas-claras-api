import { Injectable } from "@nestjs/common";
import {
	MailDeliveryPort,
} from "../domain/ports/mail-delivery.port";

@Injectable()
export class NoopMailDeliveryAdapter extends MailDeliveryPort {
	async sendVerificationEmail(): Promise<void> {
		return undefined;
	}

	async sendGroupInvitationEmail(): Promise<void> {
		return undefined;
	}
}
