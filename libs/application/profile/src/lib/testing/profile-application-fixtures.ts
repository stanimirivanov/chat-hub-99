import { Schema } from 'effect';
import { ProfileIdSchema, type Profile } from '@chat-hub/domain/profile';

export const profileId = Schema.decodeUnknownSync(ProfileIdSchema)(
  '00000000-0000-4000-8000-000000000001'
);

export const profile: Profile = {
  id: profileId,
  username: 'owner',
  displayName: 'Workspace Owner',
  avatarUrl: null,
  status: 'active',
};
