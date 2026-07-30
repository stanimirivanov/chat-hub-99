import { Injectable } from '@angular/core';
import { Effect, Either } from 'effect';
import {
  createMessage,
  deleteMessage,
  editMessage,
  listChannelMessages,
  type CreateMessageError,
  type CreateMessageInput,
  type DeleteMessageError,
  type DeleteMessageInput,
  type EditMessageError,
  type EditMessageInput,
  type ListChannelMessagesError,
  type ListChannelMessagesInput,
  type MessagePage,
} from '@chat-hub/application/message';
import type { Message } from '@chat-hub/domain/message';
import { applicationRuntime } from '../effect/application-runtime';

/**
 * Angular boundary for message application use cases.
 *
 * This service executes lazy application Effects through the shared managed
 * runtime. Expected application failures are returned as `Either` values, so
 * presentation code never has to catch typed failures as unknown rejected
 * Promise reasons.
 */
@Injectable({
  providedIn: 'root',
})
export class MessageApplicationService {
  listChannelMessages(
    input: ListChannelMessagesInput
  ): Promise<Either.Either<MessagePage, ListChannelMessagesError>> {
    return applicationRuntime.runPromise(
      listChannelMessages(input).pipe(Effect.either)
    );
  }

  createMessage(
    input: CreateMessageInput
  ): Promise<Either.Either<Message, CreateMessageError>> {
    return applicationRuntime.runPromise(
      createMessage(input).pipe(Effect.either)
    );
  }

  editMessage(
    input: EditMessageInput
  ): Promise<Either.Either<Message, EditMessageError>> {
    return applicationRuntime.runPromise(
      editMessage(input).pipe(Effect.either)
    );
  }

  deleteMessage(
    input: DeleteMessageInput
  ): Promise<Either.Either<Message, DeleteMessageError>> {
    return applicationRuntime.runPromise(
      deleteMessage(input).pipe(Effect.either)
    );
  }
}
