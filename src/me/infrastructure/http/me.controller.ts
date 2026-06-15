import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { GetMeSummaryUseCase } from "../../application/use-cases/get-me-summary.use-case";
import {
	MeSummaryEnvelopeResponseDto,
	MeSummaryResponseDto,
} from "./dto/me-summary-response.dto";
import { MeMapper } from "./mappers/me.mapper";

@ApiTags("me")
@Controller("api/v1/me")
export class MeController {
	constructor(private readonly getMeSummaryUseCase: GetMeSummaryUseCase) {}

	@Get("summary")
	@ApiOkResponse({ type: MeSummaryEnvelopeResponseDto })
	async getSummary(): Promise<MeSummaryResponseDto> {
		const summary = await this.getMeSummaryUseCase.execute();
		return MeMapper.toSummaryResponseDto(summary);
	}
}
