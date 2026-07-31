import type {
  CreateWorkspaceResult,
  CurrentWorkspace,
} from '@chat-hub/shared/database';

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
