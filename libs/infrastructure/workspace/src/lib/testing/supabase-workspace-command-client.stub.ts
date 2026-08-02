import type {
  AddWorkspaceMemberResult,
  AcceptWorkspaceInvitationResult,
  CancelWorkspaceInvitationResult,
  ArchiveWorkspaceResult,
  ChangeWorkspaceMemberRoleResult,
  CreateWorkspaceResult,
  DeclineWorkspaceInvitationResult,
  InviteWorkspaceMemberResult,
  LeaveWorkspaceResult,
  RemoveWorkspaceMemberResult,
  SuspendWorkspaceMemberResult,
  UpdateWorkspaceResult,
} from '@chat-hub/shared/database';
import { vi } from 'vitest';
import type { SupabaseWorkspaceClient } from '../supabase-workspace-client';

interface WorkspaceCommandResult {
  readonly data:
    | AddWorkspaceMemberResult
    | AcceptWorkspaceInvitationResult
    | CancelWorkspaceInvitationResult
    | ArchiveWorkspaceResult
    | CreateWorkspaceResult
    | DeclineWorkspaceInvitationResult
    | InviteWorkspaceMemberResult
    | ChangeWorkspaceMemberRoleResult
    | LeaveWorkspaceResult
    | RemoveWorkspaceMemberResult
    | SuspendWorkspaceMemberResult
    | UpdateWorkspaceResult
    | null;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: string;
  } | null;
}

interface WorkspaceCommandClientStub {
  readonly client: SupabaseWorkspaceClient;
  readonly rpc: (
    functionName: string,
    args: Record<string, unknown>
  ) => Promise<WorkspaceCommandResult>;
}

export const makeWorkspaceCommandClientStub = (
  result: WorkspaceCommandResult
): WorkspaceCommandClientStub => {
  const rpc = vi.fn().mockResolvedValue(result);

  /*
   * This deliberate external test boundary avoids constructing the complete
   * third-party client for one focused RPC command.
   */
  const client = { rpc } as unknown as SupabaseWorkspaceClient;

  return { client, rpc };
};
