import { Effect, Layer } from 'effect';
import { WorkspacePresenceServiceTag } from '@omoikane/application/workspace';
import { makeWorkspacePresenceStream } from './realtime';
import { SupabaseWorkspaceClientTag } from './supabase-workspace-client';

/**
 * Supplies workspace presence from the configured Supabase client.
 *
 * This Layer is separate from the persistence repository because Presence is
 * ephemeral collaboration state rather than a database query or command.
 */
export const SupabaseWorkspacePresenceServiceLayer = Layer.effect(
  WorkspacePresenceServiceTag,
  Effect.gen(function* () {
    const client = yield* SupabaseWorkspaceClientTag;

    return {
      observe: (workspaceId) =>
        makeWorkspacePresenceStream(client, workspaceId),
    };
  })
);
