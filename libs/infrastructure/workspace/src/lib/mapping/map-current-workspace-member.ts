import { Effect, Schema } from 'effect';
import { InvalidWorkspaceMemberDataError } from '@omoikane/application/workspace';
import {
  WorkspaceMemberSchema,
  type WorkspaceMember,
} from '@omoikane/domain/workspace';

const decodeWorkspaceMember = Schema.decodeUnknown(WorkspaceMemberSchema);

/**
 * Narrow generated-view projection required by the membership domain mapper.
 */
export interface WorkspaceMemberProjectionRow {
  readonly workspace_id: string | null;
  readonly user_id: string | null;
  readonly membership_role: string | null;
}

/**
 * Decodes one active membership row before it crosses into application code.
 */
export const mapCurrentWorkspaceMember = (
  row: WorkspaceMemberProjectionRow
): Effect.Effect<WorkspaceMember, InvalidWorkspaceMemberDataError> =>
  decodeWorkspaceMember({
    workspaceId: row.workspace_id,
    profileId: row.user_id,
    role: row.membership_role,
  }).pipe(
    Effect.mapError((cause) => new InvalidWorkspaceMemberDataError({ cause }))
  );
