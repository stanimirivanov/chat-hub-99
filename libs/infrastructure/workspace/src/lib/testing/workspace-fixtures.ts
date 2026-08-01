import type {
  AddWorkspaceMemberResult,
  ChangeWorkspaceMemberRoleResult,
  CreateWorkspaceResult,
  CurrentWorkspaceMembership,
  CurrentWorkspace,
  RemoveWorkspaceMemberResult,
} from '@chat-hub/shared/database';

export const addedWorkspaceMemberRow: AddWorkspaceMemberResult = {
  workspace_membership_id: '00000000-0000-4000-8000-000000000015',
  workspace_id: '00000000-0000-4000-8000-000000000001',
  user_id: '00000000-0000-4000-8000-000000000016',
  membership_role: 'member',
  membership_status: 'active',
  latest_event_id: '00000000-0000-4000-8000-000000000017',
};

export const currentWorkspaceRow: CurrentWorkspace = {
  workspace_id: '00000000-0000-4000-8000-000000000001',
  name: 'Chat Hub Development',
  slug: 'chat-hub-development',
  description: null,
  status: 'active',
  created_at: '2026-07-24T08:00:00.000Z',
  created_by: '00000000-0000-4000-8000-000000000002',
  version_created_at: '2026-07-24T08:00:00.000Z',
  version_created_by: '00000000-0000-4000-8000-000000000002',
  version_number: 1,
};

export const changedWorkspaceMemberRoleRow: ChangeWorkspaceMemberRoleResult = {
  workspace_membership_id: '00000000-0000-4000-8000-000000000010',
  workspace_id: '00000000-0000-4000-8000-000000000001',
  user_id: '00000000-0000-4000-8000-000000000012',
  membership_role: 'owner',
  membership_status: 'active',
  latest_event_id: '00000000-0000-4000-8000-000000000013',
};

export const removedWorkspaceMemberRow: RemoveWorkspaceMemberResult = {
  workspace_membership_id: '00000000-0000-4000-8000-000000000010',
  workspace_id: '00000000-0000-4000-8000-000000000001',
  user_id: '00000000-0000-4000-8000-000000000012',
  membership_role: 'member',
  membership_status: 'removed',
  latest_event_id: '00000000-0000-4000-8000-000000000014',
};

export const currentWorkspaceMemberRow: CurrentWorkspaceMembership = {
  workspace_membership_id: '00000000-0000-4000-8000-000000000010',
  workspace_id: '00000000-0000-4000-8000-000000000001',
  user_id: '00000000-0000-4000-8000-000000000002',
  membership_role: 'owner',
  membership_status: 'active',
  latest_event_id: '00000000-0000-4000-8000-000000000011',
  latest_event_sequence_number: 1,
  latest_event_type: 'added',
  latest_event_performed_by: '00000000-0000-4000-8000-000000000002',
  latest_event_reason: null,
  membership_created_at: '2026-07-24T08:00:00.000Z',
  latest_event_created_at: '2026-07-24T08:00:00.000Z',
};

export const createdWorkspaceRow: CreateWorkspaceResult = {
  workspace_id: '00000000-0000-4000-8000-000000000003',
  workspace_version_id: '00000000-0000-4000-8000-000000000004',
  version_number: 1,
  name: 'Product Design',
  slug: 'product-design',
  description: null,
  status: 'active',
  supersedes_workspace_version_id: null,
  created_at: '2026-07-31T12:00:00.000Z',
  created_by: '00000000-0000-4000-8000-000000000002',
};
