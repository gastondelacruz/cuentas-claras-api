import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../../shared/decorators/current-user.decorator";
import { GetMeSummaryUseCase } from "../../application/use-cases/get-me-summary.use-case";
import {
	MeSummaryEnvelopeResponseDto,
	MeSummaryResponseDto,
} from "./dto/me-summary-response.dto";
import { MeMapper } from "./mappers/me.mapper";

@ApiTags("me")
@ApiBearerAuth()
@Controller("api/v1/me")
export class MeController {
	constructor(private readonly getMeSummaryUseCase: GetMeSummaryUseCase) {}

	@Get("summary")
	@ApiOkResponse({ type: MeSummaryEnvelopeResponseDto })
	async getSummary(
		@CurrentUser("userId") userId: string,
	): Promise<MeSummaryResponseDto> {
		const summary = await this.getMeSummaryUseCase.execute(userId);
		return MeMapper.toSummaryResponseDto(summary);
	}
}
