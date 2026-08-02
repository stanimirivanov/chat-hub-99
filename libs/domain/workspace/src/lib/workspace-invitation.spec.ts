import { Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import { WorkspaceInvitationSchema } from './workspace-invitation';

const invitation = {
  id: '10000000-0000-4000-8000-000000000001',
  workspaceId: '10000000-0000-4000-8000-000000000002',
  invitedProfileId: '10000000-0000-4000-8000-000000000003',
  status: 'pending',
};

describe('WorkspaceInvitationSchema', () => {
  it('decodes the closed invitation lifecycle', () => {
    expect(
      Schema.decodeUnknownSync(WorkspaceInvitationSchema)(invitation)
    ).toEqual(invitation);

    expect(
      Schema.decodeUnknownSync(WorkspaceInvitationSchema)({
        ...invitation,
        status: 'cancelled',
      })
    ).toEqual({ ...invitation, status: 'cancelled' });
  });

  it('rejects unsupported invitation states', () => {
    expect(() =>
      Schema.decodeUnknownSync(WorkspaceInvitationSchema)({
        ...invitation,
        status: 'expired',
      })
    ).toThrow();
  });
});
