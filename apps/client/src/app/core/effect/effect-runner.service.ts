import { Injectable } from '@angular/core';
import type { Effect } from 'effect';
import type { MessageRepository } from '@chat-hub/application/message';
import { applicationRuntime } from './application-runtime';

@Injectable({
  providedIn: 'root',
})
export class EffectRunnerService {
  runPromise<A, E>(effect: Effect.Effect<A, E, MessageRepository>): Promise<A> {
    return applicationRuntime.runPromise(effect);
  }
}
