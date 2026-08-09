import type { Provider } from '@nestjs/common';
import { readServerConfig, type ServerConfig } from './server-config';

/** Nest injection key for startup-validated server configuration. */
export const SERVER_CONFIG = Symbol('SERVER_CONFIG');

/** Constructs server configuration once while Nest creates the application. */
export const serverConfigProvider: Provider<ServerConfig> = {
  provide: SERVER_CONFIG,
  useFactory: () => readServerConfig(process.env),
};
