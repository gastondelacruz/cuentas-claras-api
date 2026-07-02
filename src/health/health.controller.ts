import { Controller, Get } from "@nestjs/common";
import { ApiProperty, ApiTags } from "@nestjs/swagger";
import { Public } from "../shared/decorators/public.decorator";
import { ApiOkDataResponse } from "../shared/swagger/api-envelope-response.decorator";

export class HealthResponseDto {
	@ApiProperty({ example: "ok" })
	status!: string;

	@ApiProperty({ example: 12.34 })
	uptime!: number;
}

type HealthEnvelopeResponse = {
	data: HealthResponseDto;
};

@ApiTags("health")
@Public()
@Controller("health")
export class HealthController {
	@Get()
	@ApiOkDataResponse({ type: HealthResponseDto })
	getHealth(): HealthEnvelopeResponse {
		return {
			data: {
				status: "ok",
				uptime: process.uptime(),
			},
		};
	}
}
