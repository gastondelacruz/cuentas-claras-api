import { type Account } from "../../../domain/ports/accounts.repository";
import {
	type AccountResponseDto,
	type ListAccountsResponseDto,
} from "../dto/list-accounts-response.dto";

export class AccountsMapper {
	static toResponseDto(account: Account): AccountResponseDto {
		return {
			id: account.id,
			name: account.name,
			kind: account.kind,
			currency: account.currency,
			isDefault: account.isDefault,
		};
	}

	static toResponseListDto(accounts: Account[]): ListAccountsResponseDto {
		return {
			accounts: accounts.map((account) =>
				AccountsMapper.toResponseDto(account),
			),
		};
	}
}
