import type { ProfileRepository } from '@chat-hub/application/profile';
import { updateCurrentProfile } from './commands';
import {
  findActiveProfileByUsername,
  findCurrentProfile,
  listCurrentProfiles,
} from './queries';
import type { SupabaseProfileClient } from './supabase-profile-client';

export const makeSupabaseProfileRepository = (
  client: SupabaseProfileClient
): ProfileRepository => ({
  findActiveByUsername: (username) =>
    findActiveProfileByUsername(client, username),
  findCurrentById: (profileId) => findCurrentProfile(client, profileId),
  updateCurrent: (command) => updateCurrentProfile(client, command),
  listCurrentByIds: (profileIds) => listCurrentProfiles(client, profileIds),
});
