import type {
  CurrentProfile,
  UpdateMyProfileResult,
} from '@chat-hub/shared/database';

export const currentProfileRow: CurrentProfile = {
  user_id: '00000000-0000-4000-8000-000000000001',
  username: 'owner',
  display_name: 'Workspace Owner',
  avatar_url: null,
  status: 'active',
  created_at: '2026-07-24T08:00:00.000Z',
  version_created_at: '2026-07-24T08:00:00.000Z',
  version_number: 1,
};

export const updatedProfileRow: UpdateMyProfileResult = {
  profile_version_id: '00000000-0000-4000-8000-000000000010',
  user_id: '00000000-0000-4000-8000-000000000001',
  username: 'updated-owner',
  display_name: 'Updated Owner',
  avatar_url: null,
  status: 'active',
  version_number: 2,
  created_at: '2026-07-30T18:00:00.000Z',
  supersedes_profile_version_id: '00000000-0000-4000-8000-000000000009',
};
