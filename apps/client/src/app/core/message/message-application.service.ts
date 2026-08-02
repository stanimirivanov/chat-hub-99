import { Injectable } from '@angular/core';
import { Effect, Either, Fiber, Stream } from 'effect';
import {
  createMessage,
  deleteMessage,
  editMessage,
  listChannelMessages,
  listMessageRevisions,
  observeChannelMessages,
  type CreateMessageError,
  type CreateMessageInput,
  type DeleteMessageError,
  type DeleteMessageInput,
  type EditMessageError,
  type EditMessageInput,
  type ListChannelMessagesError,
  type ListChannelMessagesInput,
  type ListMessageRevisionsError,
  type ListMessageRevisionsInput,
  type MessagePage,
  type MessageRevisionPage,
  type MessageChange,
  type ObserveChannelMessagesError,
} from '@chat-hub/application/message';
import type { ChannelId } from '@chat-hub/domain/channel';
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

  listMessageRevisions(
    input: ListMessageRevisionsInput
  ): Promise<Either.Either<MessageRevisionPage, ListMessageRevisionsError>> {
    return applicationRuntime.runPromise(
      listMessageRevisions(input).pipe(Effect.either)
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

  /**
   * Starts a scoped stream of authoritative changes for one channel.
   *
   * The returned cleanup function interrupts the Effect Fiber, which releases
   * the underlying Supabase Realtime channel.
   */
  observeChannelMessages(
    channelId: ChannelId,
    onChange: (change: MessageChange) => void,
    onError: (error: ObserveChannelMessagesError) => void
  ): () => void {
    const program = observeChannelMessages({ channelId }).pipe(
      Stream.runForEach((change) =>
        Effect.sync(() => {
          onChange(change);
        })
      ),
      Effect.catchAll((error) =>
        Effect.sync(() => {
          onError(error);
        })
      )
    );
    const fiber = applicationRuntime.runFork(program);

    return () => {
      void applicationRuntime.runPromise(Fiber.interrupt(fiber));
    };
  }
}
