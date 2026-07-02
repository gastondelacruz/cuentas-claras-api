import { ApiProperty } from "@nestjs/swagger";

export class AccountResponseDto {
	@ApiProperty({ example: "00000000-0000-0000-0000-000000000002" })
	id: string;

	@ApiProperty({ example: "Cuenta principal" })
	name: string;

	@ApiProperty({ example: "bank" })
	kind: string;

	@ApiProperty({ example: "ARS" })
	currency: string;

	@ApiProperty({ example: true })
	isDefault: boolean;
}

export class ListAccountsResponseDto {
	@ApiProperty({ type: [AccountResponseDto] })
	accounts: AccountResponseDto[];
}
