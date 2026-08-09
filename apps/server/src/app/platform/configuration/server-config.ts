import { Either, Schema } from 'effect';

const PortSchema = Schema.NumberFromString.pipe(
  Schema.int(),
  Schema.between(1, 65_535)
);

const RequiredTextSchema = Schema.Trim.pipe(Schema.nonEmptyString());

const ServerConfigSchema = Schema.Struct({
  environment: RequiredTextSchema,
  host: RequiredTextSchema,
  port: PortSchema,
  version: RequiredTextSchema,
});

/** Validated process configuration required by the initial server runtime. */
export type ServerConfig = typeof ServerConfigSchema.Type;

/**
 * Reports invalid startup configuration before the server accepts traffic.
 *
 * The parse cause remains available for diagnostics, while the message avoids
 * copying environment values that may later contain sensitive data.
 */
export class InvalidServerConfigError extends Error {
  override readonly name = 'InvalidServerConfigError';

  constructor(override readonly cause: unknown) {
    super('The Omoikane server configuration is invalid.', { cause });
  }
}

const configuredValue = (value: string | undefined, fallback: string): string =>
  value?.trim() || fallback;

/**
 * Decodes the server-owned subset of the process environment.
 *
 * Unknown variables are ignored. Defaults make local startup deterministic;
 * explicitly supplied empty values are treated as absent, while malformed
 * non-empty values fail startup.
 */
export const readServerConfig = (
  environment: NodeJS.ProcessEnv
): ServerConfig => {
  const decoded = Schema.decodeUnknownEither(ServerConfigSchema)({
    environment: configuredValue(environment['OMOIKANE_ENV'], 'local'),
    host: configuredValue(environment['OMOIKANE_SERVER_HOST'], '0.0.0.0'),
    port: configuredValue(environment['OMOIKANE_SERVER_PORT'], '3333'),
    version: configuredValue(
      environment['OMOIKANE_SERVER_VERSION'],
      'development'
    ),
  });

  if (Either.isLeft(decoded)) {
    throw new InvalidServerConfigError(decoded.left);
  }

  return decoded.right;
};
