import type {
  CurrentChannel,
  UpdateChannelResult,
} from '@omoikane/shared/database';

export const updatedChannelVersionId: UpdateChannelResult =
  '00000000-0000-4000-8000-000000000005';

export const currentChannelRow: CurrentChannel = {
  channel_id: '00000000-0000-4000-8000-000000000001',
  workspace_id: '00000000-0000-4000-8000-000000000002',
  channel_version_id: '00000000-0000-4000-8000-000000000003',
  slug: 'general',
  name: 'General',
  description: null,
  channel_status: 'active',
  created_at: '2026-07-24T08:00:00.000Z',
  created_by: '00000000-0000-4000-8000-000000000004',
  updated_at: '2026-07-24T08:00:00.000Z',
  version_created_at: '2026-07-24T08:00:00.000Z',
  version_created_by: '00000000-0000-4000-8000-000000000004',
  version_number: 1,
};

export const archivedChannelRow: CurrentChannel = {
  ...currentChannelRow,
  channel_status: 'archived',
  updated_at: '2026-08-08T14:00:00.000Z',
};
