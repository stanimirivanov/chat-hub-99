import type { MessageRepository } from '@omoikane/application/message';

import { makeSupabaseMessageRepository } from './supabase-message-repository';
import type { SupabaseMessageClient } from './supabase-message-client';

declare const client: SupabaseMessageClient;

const repository: MessageRepository = makeSupabaseMessageRepository(client);

void repository;
