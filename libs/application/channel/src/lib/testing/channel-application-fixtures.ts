import { Schema } from 'effect';
import {
  ArchivedChannelSchema,
  ChannelIdSchema,
  type Channel,
} from '@omoikane/domain/channel';
import { WorkspaceIdSchema } from '@omoikane/domain/workspace';

export const workspaceId = Schema.decodeUnknownSync(WorkspaceIdSchema)(
  '00000000-0000-4000-8000-000000000002'
);

export const channelId = Schema.decodeUnknownSync(ChannelIdSchema)(
  '00000000-0000-4000-8000-000000000001'
);

export const channel: Channel = {
  id: channelId,
  workspaceId,
  name: 'General',
  slug: 'general',
  description: null,
};

export const archivedChannel = Schema.decodeUnknownSync(ArchivedChannelSchema)({
  ...channel,
  archivedAt: '2026-08-08T14:00:00.000Z',
});
