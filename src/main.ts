import 'dotenv/config';
import { StandardSchemaValidationPipe } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '@/app.module.js';
import appConfig from './config/app.config.js';

async function bootstrap() {
  // `cookies.secret` é opção de criação; por isso o .env é carregado acima.
  const app = await NestFactory.create(AppModule, {
    cookies: { secret: process.env.COOKIE_SECRET },
  });
  const { port, corsOrigin } = app.get<ConfigType<typeof appConfig>>(
    appConfig.KEY,
  );

  app.useSecurityHeaders();
  app.enableCors({
    origin: corsOrigin,
    methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS', 'PATCH'],
    credentials: true,
  });
  app.useGlobalPipes(new StandardSchemaValidationPipe());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Vivacesos API')
    .setDescription('Documentação da API do Vivacesos')
    .setVersion('1.0')
    .build();
  SwaggerModule.setup('docs', app, () =>
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  await app.listen(port, '0.0.0.0');
}
await bootstrap();
