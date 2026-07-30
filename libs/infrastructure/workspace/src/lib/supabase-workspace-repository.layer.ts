import { Effect, Layer } from 'effect';
import { WorkspaceRepositoryTag } from '@chat-hub/application/workspace';
import { SupabaseWorkspaceClientTag } from './supabase-workspace-client';
import { makeSupabaseWorkspaceRepository } from './supabase-workspace-repository';

/**
 * Supplies the Supabase workspace repository from its focused client.
 */
export const SupabaseWorkspaceRepositoryLayer = Layer.effect(
  WorkspaceRepositoryTag,
  Effect.gen(function* () {
    const client = yield* SupabaseWorkspaceClientTag;
    return makeSupabaseWorkspaceRepository(client);
  })
);
