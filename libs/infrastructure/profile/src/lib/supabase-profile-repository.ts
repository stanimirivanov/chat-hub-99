import type { ProfileRepository } from '@chat-hub/application/profile';
import { findCurrentProfile } from './queries';
import type { SupabaseProfileClient } from './supabase-profile-client';

export const makeSupabaseProfileRepository = (
  client: SupabaseProfileClient
): ProfileRepository => ({
  findCurrentById: (profileId) => findCurrentProfile(client, profileId),
});
