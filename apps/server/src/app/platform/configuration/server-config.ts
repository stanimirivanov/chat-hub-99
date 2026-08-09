import { Either, Schema } from 'effect';

const PortSchema = Schema.NumberFromString.pipe(
  Schema.int(),
  Schema.between(1, 65_535)
);

const RequiredTextSchema = Schema.Trim.pipe(Schema.nonEmptyString());

const HttpUrlSchema = RequiredTextSchema.pipe(
  Schema.filter(
    (value) => {
      try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
      } catch {
        return false;
      }
    },
    { message: () => 'Expected an absolute HTTP(S) URL.' }
  )
);

const ServerConfigSchema = Schema.Struct({
  environment: RequiredTextSchema,
  host: RequiredTextSchema,
  port: PortSchema,
  version: RequiredTextSchema,
  supabaseUrl: HttpUrlSchema,
  supabaseAnonKey: RequiredTextSchema,
  supabaseServiceRoleKey: RequiredTextSchema,
  readinessTimeoutMilliseconds: Schema.NumberFromString.pipe(
    Schema.int(),
    Schema.between(100, 30_000)
  ),
  allowedOrigins: Schema.Array(HttpUrlSchema),
});

/** Validated process configuration required by the active server runtime. */
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
    supabaseUrl: configuredValue(
      environment['SUPABASE_URL'],
      'http://127.0.0.1:54321'
    ),
    supabaseAnonKey: configuredValue(
      environment['SUPABASE_ANON_KEY'],
      'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
    ),
    supabaseServiceRoleKey: configuredValue(
      environment['SUPABASE_SERVICE_ROLE_KEY'],
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
    ),
    readinessTimeoutMilliseconds: configuredValue(
      environment['OMOIKANE_READINESS_TIMEOUT_MS'],
      '2000'
    ),
    allowedOrigins: configuredValue(
      environment['OMOIKANE_ALLOWED_ORIGINS'],
      'http://localhost:4200'
    )
      .split(',')
      .map((origin) => origin.trim()),
  });

  if (Either.isLeft(decoded)) {
    throw new InvalidServerConfigError(decoded.left);
  }

  return decoded.right;
};
