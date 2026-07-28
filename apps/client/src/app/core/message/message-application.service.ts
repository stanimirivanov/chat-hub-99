import { Injectable } from '@angular/core';
import {
  createMessage,
  editMessage,
  listChannelMessages,
} from '@chat-hub/application/message';
import type {
  CreateMessageInput,
  EditMessageInput,
  ListChannelMessagesInput,
} from '@chat-hub/application/message';
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

  createMessage(input: CreateMessageInput) {
    return applicationRuntime.runPromise(createMessage(input));
  }

  editMessage(input: EditMessageInput) {
    return applicationRuntime.runPromise(editMessage(input));
  }
}
