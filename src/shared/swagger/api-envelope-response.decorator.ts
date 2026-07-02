import { applyDecorators, HttpStatus, type Type } from "@nestjs/common";
import {
	ApiExtraModels,
	ApiProperty,
	ApiResponse,
	getSchemaPath,
} from "@nestjs/swagger";

export class ApiResponseEnvelopeDto<TData = unknown> {
	@ApiProperty({ description: "Successful response payload." })
	data!: TData;
}

type ApiEnvelopeResponseOptions<TModel extends Type<unknown>> = {
	description?: string;
	isArray?: boolean;
	status: number;
	type: TModel;
};

type ApiDataResponseOptions<TModel extends Type<unknown>> = Omit<
	ApiEnvelopeResponseOptions<TModel>,
	"status"
>;

export function ApiDataResponse<TModel extends Type<unknown>>(
	options: ApiEnvelopeResponseOptions<TModel>,
): MethodDecorator {
	return applyDecorators(
		ApiExtraModels(ApiResponseEnvelopeDto, options.type),
		ApiResponse({
			description: options.description,
			status: options.status,
			schema: {
				allOf: [
					{ $ref: getSchemaPath(ApiResponseEnvelopeDto) },
					{
						properties: {
							data: createDataSchema(options),
						},
					},
				],
			},
		}),
	);
}

export function ApiOkDataResponse<TModel extends Type<unknown>>(
	options: ApiDataResponseOptions<TModel>,
): MethodDecorator {
	return ApiDataResponse({
		...options,
		status: HttpStatus.OK,
	});
}

export function ApiCreatedDataResponse<TModel extends Type<unknown>>(
	options: ApiDataResponseOptions<TModel>,
): MethodDecorator {
	return ApiDataResponse({
		...options,
		status: HttpStatus.CREATED,
	});
}

function createDataSchema<TModel extends Type<unknown>>(
	options: ApiEnvelopeResponseOptions<TModel>,
) {
	if (options.isArray === true) {
		return {
			items: { $ref: getSchemaPath(options.type) },
			type: "array",
		};
	}

	return { $ref: getSchemaPath(options.type) };
}
