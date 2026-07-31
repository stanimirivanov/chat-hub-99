import { Injectable } from '@angular/core';
import { Effect, Either } from 'effect';
import {
  createChannel,
  listWorkspaceChannels,
  type CreateChannelError,
  type CreateChannelInput,
  type ChannelRepositoryReadError,
} from '@chat-hub/application/channel';
import type { Channel } from '@chat-hub/domain/channel';
import type { WorkspaceId } from '@chat-hub/domain/workspace';
import { applicationRuntime } from '../effect/application-runtime';

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
}
