import { Effect } from 'effect';
import {
  InvalidWorkspaceDataError,
  type CreateWorkspaceCommand,
  type WorkspaceRepositoryCreateError,
} from '@omoikane/application/workspace';
import type { Workspace } from '@omoikane/domain/workspace';
import type { CreateWorkspaceResult } from '@omoikane/shared/database';
import {
  mapWorkspaceCreateError,
  mapWorkspaceRepositoryError,
} from '../errors';
import { mapCurrentWorkspace, toCreateWorkspaceArgs } from '../mapping';
import type { SupabaseWorkspaceClient } from '../supabase-workspace-client';

/**
 * Executes the transactional workspace-creation RPC and validates its
 * canonical workspace projection before it crosses the adapter boundary.
 */
export const createWorkspace = (
  client: SupabaseWorkspaceClient,
  command: CreateWorkspaceCommand
): Effect.Effect<Workspace, WorkspaceRepositoryCreateError> =>
  Effect.tryPromise({
    try: () => client.rpc('create_workspace', toCreateWorkspaceArgs(command)),
    catch: mapWorkspaceRepositoryError,
  }).pipe(
    Effect.flatMap(({ data, error }) => {
      if (error !== null) {
        return Effect.fail(mapWorkspaceCreateError(command, error));
      }

      return mapCreateResult(data);
    })
  );

const mapCreateResult = (
  result: CreateWorkspaceResult | null
): Effect.Effect<Workspace, InvalidWorkspaceDataError> =>
  result === null
    ? Effect.fail(
        new InvalidWorkspaceDataError({
          cause: 'The workspace creation returned no workspace version.',
        })
      )
    : mapCurrentWorkspace(result);
