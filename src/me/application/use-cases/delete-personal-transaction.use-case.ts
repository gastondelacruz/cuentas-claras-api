import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../../shared/exceptions/business.exception";
// biome-ignore lint/style/useImportType: Nest uses this abstract class as a runtime DI token.
import { PersonalTransactionsRepository } from "../../domain/ports/personal-transactions.repository";

export type DeletePersonalTransactionInput = {
	userId: string;
	transactionId: string;
};

@Injectable()
export class DeletePersonalTransactionUseCase {
	constructor(
		private readonly personalTransactionsRepository: PersonalTransactionsRepository,
	) {}

	async execute(input: DeletePersonalTransactionInput): Promise<void> {
		const deleted = await this.personalTransactionsRepository.delete(
			input.transactionId,
			input.userId,
		);

		if (!deleted) {
			throw new BusinessException(
				"PERSONAL_TX_NOT_FOUND",
				"Personal transaction not found.",
				404,
			);
		}
	}
}
