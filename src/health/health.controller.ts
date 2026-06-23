import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { Public } from "../shared/decorators/public.decorator";

@ApiTags("health")
@Public()
@Controller("health")
export class HealthController {
	@Get()
	@ApiOkResponse({
		schema: {
			example: {
				data: {
					status: "ok",
					uptime: 12.34,
				},
			},
		},
	})
	getHealth() {
		return {
			status: "ok",
			uptime: process.uptime(),
		};
	}
}
