import { ApiProperty } from "@nestjs/swagger";

export class DeleteExpenseResponseDto {
	@ApiProperty({ example: "770e8400-e29b-41d4-a716-446655440000" })
	id!: string;

	@ApiProperty({ example: "2026-06-29T10:30:00.000Z" })
	deletedAt!: string;
}
