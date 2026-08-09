import { Inject, Injectable, type OnApplicationShutdown } from '@nestjs/common';
import * as EffectOtelTracer from '@effect/opentelemetry/Tracer';
import { Effect, Either, Layer, ManagedRuntime } from 'effect';
import type { AccessTokenValidator } from '@omoikane/application/authentication';
import type { AnalysisRunRepository } from '@omoikane/application/analysis';
import {
  makeSupabaseAnalysisClientLayer,
  SupabaseAnalysisRunRepositoryLayer,
} from '@omoikane/infrastructure/analysis';
import {
  makeSupabaseAccessTokenClientLayer,
  SupabaseAccessTokenValidatorLayer,
} from '@omoikane/infrastructure/authentication';
import { SERVER_CONFIG } from '../configuration/server-config.provider';
import type { ServerConfig } from '../configuration/server-config';
import {
  ServerTelemetry,
  type ServerObservedOperation,
  type TelemetryRequest,
} from '../observability/server-telemetry.service';

/**
 * Owns the single Effect runtime used at the NestJS execution boundary.
 *
 * The runtime currently composes the configured Supabase client into the
 * access-token-validator capability required by the guard and readiness
 * check. Application and domain code continue to build Effects; this outer
 * runtime is responsible for supplying dependencies and executing them.
 */
@Injectable()
export class ServerEffectRuntime implements OnApplicationShutdown {
  private readonly managedRuntime: ManagedRuntime.ManagedRuntime<
    AccessTokenValidator | AnalysisRunRepository,
    never
  >;
  private disposed = false;

  constructor(
    @Inject(SERVER_CONFIG) config: ServerConfig,
    private readonly telemetry: ServerTelemetry
  ) {
    const clientLayer = makeSupabaseAccessTokenClientLayer({
      url: config.supabaseUrl,
      anonKey: config.supabaseAnonKey,
      readinessTimeoutMilliseconds: config.readinessTimeoutMilliseconds,
    });
    const authenticationLayer = SupabaseAccessTokenValidatorLayer.pipe(
      Layer.provide(clientLayer)
    );
    const analysisClientLayer = makeSupabaseAnalysisClientLayer({
      url: config.supabaseUrl,
      serviceRoleKey: config.supabaseServiceRoleKey,
    });
    const analysisLayer = SupabaseAnalysisRunRepositoryLayer.pipe(
      Layer.provide(analysisClientLayer)
    );
    const liveLayer = Layer.merge(authenticationLayer, analysisLayer).pipe(
      Layer.merge(this.telemetry.effectLayer)
    );

    this.managedRuntime = ManagedRuntime.make(liveLayer);
  }

  /** Eagerly initializes the Layer graph before the server reports startup. */
  async initialize(): Promise<void> {
    await this.managedRuntime.runtime();
  }

  /** Executes an Effect whose requirements are supplied by the server Layer. */
  runPromise<A, E>(
    program: Effect.Effect<A, E, AccessTokenValidator | AnalysisRunRepository>
  ): Promise<A> {
    return this.managedRuntime.runPromise(program);
  }

  /**
   * Runs one request-owned workflow as a child of the explicit HTTP span.
   *
   * Returning `Either` keeps expected failures typed at the transport boundary
   * while allowing bounded operation metrics to distinguish success/failure.
   */
  async runRequestEither<A, E>(
    request: TelemetryRequest,
    operation: ServerObservedOperation,
    program: Effect.Effect<A, E, AccessTokenValidator | AnalysisRunRepository>
  ): Promise<Either.Either<A, E>> {
    const parent = this.telemetry.requestSpanContext(request);
    const observed = program.pipe(
      Effect.withSpan(operation, { kind: 'internal' }),
      parent === undefined
        ? (effect) => effect
        : EffectOtelTracer.withSpanContext(parent),
      Effect.either
    );
    const startedAt = performance.now();
    const result = await this.managedRuntime.runPromise(observed);
    this.telemetry.recordOperation(
      operation,
      performance.now() - startedAt,
      Either.isLeft(result)
    );
    return result;
  }

  /** Releases Effect-managed resources once, including during Nest shutdown. */
  async dispose(): Promise<void> {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    await this.managedRuntime.dispose();
    await this.telemetry.shutdown();
  }

  onApplicationShutdown(): Promise<void> {
    return this.dispose();
  }
}
