import { Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { Effect, Layer, ManagedRuntime } from 'effect';

/**
 * Owns the single Effect runtime used at the NestJS execution boundary.
 *
 * The initial Layer is empty because the bootstrap slice has no application
 * services. Capability Layers are merged here only when an implemented use
 * case requires them. Application and domain code continue to build Effects;
 * this outer runtime is responsible for executing them.
 */
@Injectable()
export class ServerEffectRuntime implements OnApplicationShutdown {
  private readonly managedRuntime = ManagedRuntime.make(Layer.empty);
  private disposed = false;

  /** Eagerly initializes the Layer graph before the server reports startup. */
  async initialize(): Promise<void> {
    await this.managedRuntime.runtime();
  }

  /** Executes an Effect whose requirements are supplied by the server Layer. */
  runPromise<A, E>(program: Effect.Effect<A, E, never>): Promise<A> {
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
