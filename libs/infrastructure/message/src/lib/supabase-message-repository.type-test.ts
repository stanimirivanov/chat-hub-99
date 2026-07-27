import type { MessageRepository } from '@chat-hub/application/message';

import { makeSupabaseMessageRepository } from './supabase-message-repository';
import type { ChatHubSupabaseClient } from './supabase-message-client';

declare const client: ChatHubSupabaseClient;

const repository: MessageRepository = makeSupabaseMessageRepository(client);

void repository;
