import { RequestMethod, type Type } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ServerEffectRuntime } from './app/platform/effect-runtime/server-effect-runtime.service';
import { SERVER_CONFIG } from './app/platform/configuration/server-config.provider';
import type { ServerConfig } from './app/platform/configuration/server-config';
import { ServerModule } from './app/server.module';

const configureOpenApi = (app: NestFastifyApplication): void => {
  const openApiConfig = new DocumentBuilder()
    .setTitle('Omoikane Server API')
    .setDescription('Trusted APIs for the Omoikane collaboration platform.')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, openApiConfig);

  SwaggerModule.setup('openapi', app, document, {
    jsonDocumentUrl: 'openapi.json',
    raw: ['json'],
    ui: false,
  });
};

/**
 * Constructs and initializes the server without opening a network listener.
 *
 * Keeping construction separate from `main.ts` lets integration tests exercise
 * the real Fastify, Nest, OpenAPI, and Effect lifecycle in process.
 */
export const createServer = async (
  rootModule: Type = ServerModule
): Promise<NestFastifyApplication> => {
  const app = await NestFactory.create<NestFastifyApplication>(
    rootModule,
    new FastifyAdapter()
  );

  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: 'health/live', method: RequestMethod.GET },
      { path: 'health/ready', method: RequestMethod.GET },
    ],
  });
  const config = app.get<ServerConfig>(SERVER_CONFIG);
  app.enableCors({
    origin: [...config.allowedOrigins],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Authorization', 'Content-Type'],
  });
  app.enableShutdownHooks();
  configureOpenApi(app);

  await app.init();
  await app.get(ServerEffectRuntime).initialize();

  return app;
};
