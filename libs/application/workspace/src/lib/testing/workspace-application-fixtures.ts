import { Schema } from 'effect';
import {
  WorkspaceInvitationSchema,
  WorkspaceMemberSchema,
  WorkspaceSchema,
} from '@chat-hub/domain/workspace';

export const workspace = Schema.decodeUnknownSync(WorkspaceSchema)({
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Chat Hub Development',
  slug: 'chat-hub-development',
  description: null,
});

export const workspaceMember = Schema.decodeUnknownSync(WorkspaceMemberSchema)({
  workspaceId: workspace.id,
  profileId: '00000000-0000-4000-8000-000000000002',
  role: 'owner',
});

export const workspaceInvitation = Schema.decodeUnknownSync(
  WorkspaceInvitationSchema
)({
  id: '00000000-0000-4000-8000-000000000003',
  workspaceId: workspace.id,
  invitedProfileId: workspaceMember.profileId,
  status: 'pending',
});
