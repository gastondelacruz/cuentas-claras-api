import { Injectable } from "@nestjs/common";
import {
	AccountsRepository,
	type Account,
} from "../../domain/ports/accounts.repository";

@Injectable()
export class ListMyAccountsUseCase {
	constructor(private readonly accountsRepository: AccountsRepository) {}

	async execute(userId: string): Promise<Account[]> {
		return this.accountsRepository.findByUserId(userId);
	}
}
