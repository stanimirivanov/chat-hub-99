import { Effect } from 'effect';
import {
  WorkspaceRepositoryTag,
  type PendingWorkspaceInvitation,
  type WorkspaceInvitationRepositoryReadError,
  type WorkspaceRepository,
} from '../repository';

/**
 * Lists pending invitations addressed to the authenticated provider identity.
 */
export const listPendingWorkspaceInvitations: Effect.Effect<
  readonly PendingWorkspaceInvitation[],
  WorkspaceInvitationRepositoryReadError,
  WorkspaceRepository
> = Effect.flatMap(WorkspaceRepositoryTag, (repository) =>
  repository.listPendingInvitations()
);
