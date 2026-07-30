import { Layer } from 'effect';
import {
  SupabaseAuthenticationClientTag,
  type SupabaseAuthenticationClient,
} from '@chat-hub/infrastructure/authentication';
import {
  SupabaseMessageClientTag,
  type ChatHubSupabaseClient,
} from '@chat-hub/infrastructure/message';
import {
  SupabaseWorkspaceClientTag,
  type SupabaseWorkspaceClient,
} from '@chat-hub/infrastructure/workspace';
import { makeSupabaseClient } from './make-supabase-client';
import type { SupabaseClientConfig } from './supabase-client-config';

/**
 * Creates the infrastructure client Layer from explicit browser configuration.
 *
 * One Supabase client instance is exposed through capability-specific Tags for
 * the adapters that currently require it. This preserves focused adapter
 * contracts without constructing multiple browser clients.
 */
export const makeSupabaseClientLayer = (config: SupabaseClientConfig) => {
  const client = makeSupabaseClient(config);

  const messageClientLayer = Layer.succeed(
    SupabaseMessageClientTag,
    client as ChatHubSupabaseClient
  );

  const authenticationClientLayer = Layer.succeed(
    SupabaseAuthenticationClientTag,
    client as SupabaseAuthenticationClient
  );

  const workspaceClientLayer = Layer.succeed(
    SupabaseWorkspaceClientTag,
    client satisfies SupabaseWorkspaceClient
  );

  return Layer.merge(
    Layer.merge(messageClientLayer, authenticationClientLayer),
    workspaceClientLayer
  );
};
