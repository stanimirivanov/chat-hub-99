import { Injectable } from '@angular/core';
import { listChannelMessages } from '@chat-hub/application/message';
import type { ListChannelMessagesInput } from '@chat-hub/application/message';
import { applicationRuntime } from '../effect/application-runtime';

/**
 * Angular boundary for message application use cases.
 *
 * Presentation code calls this service without depending on Effect Layers or
 * concrete infrastructure adapters.
 */
@Injectable({
  providedIn: 'root',
})
export class MessageApplicationService {
  listChannelMessages(input: ListChannelMessagesInput) {
    return applicationRuntime.runPromise(listChannelMessages(input));
  }
}
