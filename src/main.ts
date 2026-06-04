import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { PrismaService } from "./prisma/prisma.service";
import { HttpExceptionFilter } from "./shared/filters/http-exception.filter";
import { ResponseInterceptor } from "./shared/interceptors/response.interceptor";

async function bootstrap() {
	const app = await NestFactory.create(AppModule);
	const configService = app.get(ConfigService);

	app.enableCors();
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			transform: true,
		}),
	);
	app.useGlobalFilters(new HttpExceptionFilter());
	app.useGlobalInterceptors(new ResponseInterceptor());

	const swaggerConfig = new DocumentBuilder()
		.setTitle("Cuentas Claras API")
		.setDescription("Shared expenses REST API")
		.setVersion("0.1.0")
		.addBearerAuth()
		.build();
	const document = SwaggerModule.createDocument(app, swaggerConfig);
	SwaggerModule.setup("docs", app, document);

	const prismaService = app.get(PrismaService);
	prismaService.enableShutdownHooks(app);

	const port = configService.get<number>("app.port", 3000);
	await app.listen(port);
}

void bootstrap();
