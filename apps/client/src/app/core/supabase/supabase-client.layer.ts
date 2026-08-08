import { Layer } from 'effect';
import {
  SupabaseAuthenticationClientTag,
  type SupabaseAuthenticationClient,
} from '@omoikane/infrastructure/authentication';
import {
  SupabaseChannelClientTag,
  type SupabaseChannelClient,
} from '@omoikane/infrastructure/channel';
import {
  SupabaseMessageClientTag,
  type ChatHubSupabaseClient,
} from '@omoikane/infrastructure/message';
import {
  SupabaseProfileClientTag,
  type SupabaseProfileClient,
} from '@omoikane/infrastructure/profile';
import {
  SupabaseWorkspaceClientTag,
  type SupabaseWorkspaceClient,
} from '@omoikane/infrastructure/workspace';
import { makeSupabaseClient } from './make-supabase-client';
import type { SupabaseClientConfig } from './supabase-client-config';

/**
 * Creates the infrastructure client Layer from explicit browser configuration.
 *
 * One Supabase client instance is exposed through capability-specific Tags for
 * the adapters that currently require it. This preserves focused adapter
 * contracts without constructing multiple browser clients.
 *
 * `Layer.succeed` associates an already constructed value with a Tag.
 * `Layer.mergeAll` combines those bindings, but does not create additional
 * Supabase clients: every Tag below resolves to the same browser client
 * instance viewed through the type required by its adapter.
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

  const channelClientLayer = Layer.succeed(
    SupabaseChannelClientTag,
    client satisfies SupabaseChannelClient
  );

  const profileClientLayer = Layer.succeed(
    SupabaseProfileClientTag,
    client satisfies SupabaseProfileClient
  );

  const workspaceClientLayer = Layer.succeed(
    SupabaseWorkspaceClientTag,
    client satisfies SupabaseWorkspaceClient
  );

  return Layer.mergeAll(
    messageClientLayer,
    authenticationClientLayer,
    channelClientLayer,
    profileClientLayer,
    workspaceClientLayer
  );
};
