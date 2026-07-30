import { Effect, Layer } from 'effect';
import { WorkspaceRepositoryTag } from '@chat-hub/application/workspace';
import { SupabaseWorkspaceClientTag } from './supabase-workspace-client';
import { makeSupabaseWorkspaceRepository } from './supabase-workspace-repository';

/**
 * Supplies the Supabase workspace repository from its focused client.
 *
 * `Layer.effect` constructs the service registered under
 * `WorkspaceRepositoryTag`. The generator retrieves the configured Supabase
 * client through `SupabaseWorkspaceClientTag`, making that client the Layer's
 * explicit requirement. Runtime composition satisfies the requirement without
 * the application use case knowing which database implements its repository.
 */
export const SupabaseWorkspaceRepositoryLayer = Layer.effect(
  WorkspaceRepositoryTag,
  Effect.gen(function* () {
    const client = yield* SupabaseWorkspaceClientTag;
    return makeSupabaseWorkspaceRepository(client);
  })
);
