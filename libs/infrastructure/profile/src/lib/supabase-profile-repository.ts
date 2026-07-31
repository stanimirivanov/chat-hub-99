import type { ProfileRepository } from '@chat-hub/application/profile';
import { updateCurrentProfile } from './commands';
import { findCurrentProfile, listCurrentProfiles } from './queries';
import type { SupabaseProfileClient } from './supabase-profile-client';

export const makeSupabaseProfileRepository = (
  client: SupabaseProfileClient
): ProfileRepository => ({
  findCurrentById: (profileId) => findCurrentProfile(client, profileId),
  updateCurrent: (command) => updateCurrentProfile(client, command),
  listCurrentByIds: (profileIds) => listCurrentProfiles(client, profileIds),
});
