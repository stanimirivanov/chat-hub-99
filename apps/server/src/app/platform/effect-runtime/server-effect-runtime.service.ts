import { Inject, Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { Effect, Layer, ManagedRuntime } from 'effect';
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

  constructor(@Inject(SERVER_CONFIG) config: ServerConfig) {
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
    const liveLayer = Layer.merge(authenticationLayer, analysisLayer);

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

  /** Releases Effect-managed resources once, including during Nest shutdown. */
  async dispose(): Promise<void> {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    await this.managedRuntime.dispose();
  }

  onApplicationShutdown(): Promise<void> {
    return this.dispose();
  }
}
