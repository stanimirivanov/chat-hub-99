import { Injectable } from '@angular/core';
import type { Effect } from 'effect';
import type { MessageRepository } from '@chat-hub/application/message';
import { ApplicationRuntime } from './application-runtime';

/**
 * Angular boundary for executing application Effects.
 */
@Injectable({
  providedIn: 'root',
})
export class EffectRunner {
  runPromise<A, E>(effect: Effect.Effect<A, E, MessageRepository>): Promise<A> {
    return ApplicationRuntime.runPromise(effect);
  }

  runPromiseExit<A, E>(effect: Effect.Effect<A, E, MessageRepository>) {
    return ApplicationRuntime.runPromiseExit(effect);
  }
}
