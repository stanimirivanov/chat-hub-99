import { Logger } from '@nestjs/common';
import { SERVER_CONFIG } from './app/platform/configuration/server-config.provider';
import type { ServerConfig } from './app/platform/configuration/server-config';
import { createServer } from './create-server';

const bootstrap = async (): Promise<void> => {
  const app = await createServer();
  const config = app.get<ServerConfig>(SERVER_CONFIG);

  await app.listen(config.port, config.host);
  Logger.log(
    `Omoikane server listening on ${config.host}:${config.port}`,
    'Bootstrap'
  );
};

void bootstrap().catch((cause: unknown) => {
  const message =
    cause instanceof Error ? cause.message : 'Unknown server startup failure.';
  Logger.error(message, undefined, 'Bootstrap');
  process.exitCode = 1;
});
