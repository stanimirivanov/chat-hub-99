import { Schema } from 'effect';
import { WorkspaceIdSchema } from '@chat-hub/domain/workspace';

export const workspaceId = Schema.decodeUnknownSync(WorkspaceIdSchema)(
  '00000000-0000-4000-8000-000000000002'
);
