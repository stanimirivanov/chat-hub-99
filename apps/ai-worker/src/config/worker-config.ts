import { hostname } from 'node:os';
import { Either, Schema } from 'effect';

const RequiredTextSchema = Schema.Trim.pipe(
  Schema.nonEmptyString(),
  Schema.maxLength(128),
  Schema.pattern(/^[^\r\n]+$/u)
);

const SecretTextSchema = Schema.Trim.pipe(
  Schema.nonEmptyString(),
  Schema.maxLength(4096),
  Schema.pattern(/^[^\r\n]+$/u)
);

const PortSchema = Schema.NumberFromString.pipe(
  Schema.int(),
  Schema.between(1, 65_535)
);

const PositiveMillisecondsSchema = Schema.NumberFromString.pipe(
  Schema.int(),
  Schema.between(10, 30_000)
);

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

const WorkerConfigSchema = Schema.Struct({
  environment: RequiredTextSchema,
  host: RequiredTextSchema,
  port: PortSchema,
  version: RequiredTextSchema,
  workerId: RequiredTextSchema,
  supabaseUrl: HttpUrlSchema,
  supabaseSecretKey: SecretTextSchema,
  pollIntervalMilliseconds: PositiveMillisecondsSchema,
  jobLeaseSeconds: Schema.NumberFromString.pipe(
    Schema.int(),
    Schema.between(1, 300)
  ),
  drainTimeoutMilliseconds: PositiveMillisecondsSchema,
  readinessTimeoutMilliseconds: PositiveMillisecondsSchema,
  telemetryEndpoint: Schema.NullOr(HttpUrlSchema),
  telemetryShutdownTimeoutMilliseconds: PositiveMillisecondsSchema,
});

export type WorkerConfig = typeof WorkerConfigSchema.Type;

export class InvalidWorkerConfigError extends Error {
  override readonly name = 'InvalidWorkerConfigError';

  constructor(override readonly cause: unknown) {
    super('The Omoikane AI worker configuration is invalid.', { cause });
  }
}

const configuredValue = (value: string | undefined, fallback: string): string =>
  value?.trim() || fallback;

const configuredSupabaseSecretKey = (
  environment: NodeJS.ProcessEnv
): string | undefined =>
  environment['SUPABASE_SECRET_KEY']?.trim() ||
  environment['SUPABASE_SERVICE_ROLE_KEY']?.trim() ||
  undefined;

/** Decodes only the environment owned by the worker process. */
export const readWorkerConfig = (
  environment: NodeJS.ProcessEnv
): WorkerConfig => {
  const decoded = Schema.decodeUnknownEither(WorkerConfigSchema)({
    environment: configuredValue(environment['OMOIKANE_ENV'], 'local'),
    host: configuredValue(environment['OMOIKANE_AI_WORKER_HOST'], '0.0.0.0'),
    port: configuredValue(environment['OMOIKANE_AI_WORKER_PORT'], '3334'),
    version: configuredValue(
      environment['OMOIKANE_AI_WORKER_VERSION'],
      'development'
    ),
    workerId: configuredValue(
      environment['OMOIKANE_AI_WORKER_ID'],
      `${hostname()}-${process.pid}`
    ),
    supabaseUrl: configuredValue(
      environment['SUPABASE_URL'],
      'http://127.0.0.1:54321'
    ),
    supabaseSecretKey: configuredSupabaseSecretKey(environment),
    pollIntervalMilliseconds: configuredValue(
      environment['OMOIKANE_AI_WORKER_POLL_INTERVAL_MS'],
      '1000'
    ),
    jobLeaseSeconds: configuredValue(
      environment['OMOIKANE_AI_WORKER_JOB_LEASE_SECONDS'],
      '60'
    ),
    drainTimeoutMilliseconds: configuredValue(
      environment['OMOIKANE_AI_WORKER_DRAIN_TIMEOUT_MS'],
      '5000'
    ),
    readinessTimeoutMilliseconds: configuredValue(
      environment['OMOIKANE_READINESS_TIMEOUT_MS'],
      '2000'
    ),
    telemetryEndpoint:
      environment['OTEL_EXPORTER_OTLP_ENDPOINT']?.trim() || null,
    telemetryShutdownTimeoutMilliseconds: configuredValue(
      environment['OMOIKANE_TELEMETRY_SHUTDOWN_TIMEOUT_MS'],
      '3000'
    ),
  });

  if (Either.isLeft(decoded)) {
    throw new InvalidWorkerConfigError(decoded.left);
  }

  return decoded.right;
};
