import type { Layer } from 'effect';
import type { MessageRepository } from '@chat-hub/application/message';
import type { ChatHubSupabaseClient } from './supabase-message-client';
import { SupabaseMessageRepositoryLayer } from './supabase-message-repository';

const layer: Layer.Layer<MessageRepository, never, ChatHubSupabaseClient> =
  SupabaseMessageRepositoryLayer;

void layer;
