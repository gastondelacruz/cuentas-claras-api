import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class AcceptGroupInvitationRequestDto {
	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	token!: string;
}
