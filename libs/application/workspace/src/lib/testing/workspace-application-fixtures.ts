import { Schema } from 'effect';
import { WorkspaceSchema } from '@chat-hub/domain/workspace';

export const workspace = Schema.decodeUnknownSync(WorkspaceSchema)({
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Chat Hub Development',
  slug: 'chat-hub-development',
  description: null,
});
