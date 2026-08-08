import { Injectable } from '@angular/core';
import { Effect, Either, Fiber, Stream } from 'effect';
import {
  archiveChannel,
  createChannel,
  connectChannelTyping,
  listWorkspaceChannels,
  listArchivedWorkspaceChannels,
  observeWorkspaceChannels,
  restoreChannel,
  updateChannel,
  type CreateChannelError,
  type CreateChannelInput,
  type ChannelRepositoryReadError,
  type ObserveWorkspaceChannelsError,
  type RestoreChannelError,
  type RestoreChannelInput,
  type ArchiveChannelError,
  type ArchiveChannelInput,
  type UpdatedChannelDetails,
  type UpdateChannelError,
  type UpdateChannelInput,
  type ChannelTypingConnection,
  type ChannelTypingEvent,
  type ChannelTypingUnavailableError,
  type InvalidChannelTypingInputError,
} from '@omoikane/application/channel';
import type {
  ArchivedChannel,
  Channel,
  ChannelId,
} from '@omoikane/domain/channel';
import type { WorkspaceId } from '@omoikane/domain/workspace';
import { applicationRuntime } from '../effect/application-runtime';

/** Imperative Angular handle backed by one scoped Effect typing connection. */
export interface ChannelTypingController {
  readonly setTyping: (isTyping: boolean) => Promise<boolean>;
  readonly close: () => void;
}

/**
 * Angular execution boundary for channel application programs.
 *
 * Expected repository failures are exposed as `Either` values, so feature
 * state can handle them without converting them into rejected Promises.
 */
@Injectable({
  providedIn: 'root',
})
export class ChannelApplicationService {
  /** Opens one channel typing connection and owns it through an Effect Fiber. */
  connectChannelTyping(
    channelId: ChannelId,
    onConnected: () => void,
    onEvent: (event: ChannelTypingEvent) => void,
    onError: (
      error: InvalidChannelTypingInputError | ChannelTypingUnavailableError
    ) => void
  ): ChannelTypingController {
    let resolveReady:
      | ((connection: ChannelTypingConnection | null) => void)
      | undefined;
    let readySettled = false;
    const ready = new Promise<ChannelTypingConnection | null>((resolve) => {
      resolveReady = resolve;
    });
    const settleReady = (connection: ChannelTypingConnection | null): void => {
      if (!readySettled) {
        readySettled = true;
        resolveReady?.(connection);
      }
    };

    const program = Effect.scoped(
      Effect.gen(function* () {
        const connection = yield* connectChannelTyping({ channelId });
        yield* Effect.sync(() => {
          settleReady(connection);
          onConnected();
        });
        yield* connection.events.pipe(
          Stream.runForEach((event) => Effect.sync(() => onEvent(event)))
        );
      })
    ).pipe(
      Effect.catchAll((error) =>
        Effect.sync(() => {
          settleReady(null);
          onError(error);
        })
      )
    );
    const fiber = applicationRuntime.runFork(program);

    return {
      setTyping: async (isTyping) => {
        const connection = await ready;
        if (connection === null) return false;
        const result = await applicationRuntime.runPromise(
          connection.setTyping(isTyping).pipe(Effect.either)
        );
        return Either.match(result, {
          onLeft: (error) => {
            onError(error);
            return false;
          },
          onRight: () => true,
        });
      },
      close: () => {
        settleReady(null);
        void applicationRuntime.runPromise(Fiber.interrupt(fiber));
      },
    };
  }
  /**
   * Archives one channel using provider-session authorization.
   */
  archiveChannel(
    input: ArchiveChannelInput
  ): Promise<Either.Either<void, ArchiveChannelError>> {
    return applicationRuntime.runPromise(
      archiveChannel(input).pipe(Effect.either)
    );
  }

  /**
   * Lists active channels visible in one selected workspace.
   */
  listWorkspaceChannels(
    workspaceId: WorkspaceId
  ): Promise<Either.Either<readonly Channel[], ChannelRepositoryReadError>> {
    return applicationRuntime.runPromise(
      listWorkspaceChannels(workspaceId).pipe(Effect.either)
    );
  }

  /** Lists owner-visible archived channels for one selected workspace. */
  listArchivedWorkspaceChannels(
    workspaceId: WorkspaceId
  ): Promise<
    Either.Either<readonly ArchivedChannel[], ChannelRepositoryReadError>
  > {
    return applicationRuntime.runPromise(
      listArchivedWorkspaceChannels(workspaceId).pipe(Effect.either)
    );
  }

  /** Restores one archived channel through authenticated owner authority. */
  restoreChannel(
    input: RestoreChannelInput
  ): Promise<Either.Either<Channel, RestoreChannelError>> {
    return applicationRuntime.runPromise(
      restoreChannel(input).pipe(Effect.either)
    );
  }

  /**
   * Starts a private observation of authoritative active-channel snapshots.
   *
   * The returned cleanup interrupts the Effect Fiber, which releases the
   * underlying Supabase Realtime channel.
   */
  observeWorkspaceChannels(
    workspaceId: WorkspaceId,
    onChannels: (channels: readonly Channel[]) => void,
    onError: (error: ObserveWorkspaceChannelsError) => void
  ): () => void {
    const program = observeWorkspaceChannels({ workspaceId }).pipe(
      Stream.runForEach((channels) =>
        Effect.sync(() => {
          onChannels(channels);
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

  /**
   * Creates a channel for the authenticated member of one workspace.
   */
  createChannel(
    input: CreateChannelInput
  ): Promise<Either.Either<Channel, CreateChannelError>> {
    return applicationRuntime.runPromise(
      createChannel(input).pipe(Effect.either)
    );
  }

  /**
   * Updates mutable details for one channel using session authorization.
   */
  updateChannel(
    input: UpdateChannelInput
  ): Promise<Either.Either<UpdatedChannelDetails, UpdateChannelError>> {
    return applicationRuntime.runPromise(
      updateChannel(input).pipe(Effect.either)
    );
  }
}
