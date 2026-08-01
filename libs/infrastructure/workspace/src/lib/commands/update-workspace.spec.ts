import { Effect, Either, Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import type { UpdateWorkspaceCommand } from '@chat-hub/application/workspace';
import { WorkspaceIdSchema } from '@chat-hub/domain/workspace';
import {
  makeWorkspaceCommandClientStub,
  updatedWorkspaceRow,
} from '../testing';
import { updateWorkspace } from './update-workspace';

const command: UpdateWorkspaceCommand = {
  workspaceId: Schema.decodeUnknownSync(WorkspaceIdSchema)(
    updatedWorkspaceRow.workspace_id
  ),
  name: 'Chat Hub Community',
  slug: 'chat-hub-community',
  description: 'Updated collaboration space',
};

describe('updateWorkspace', () => {
  it('executes the RPC and returns its validated canonical projection', async () => {
    const stub = makeWorkspaceCommandClientStub({
      data: updatedWorkspaceRow,
      error: null,
    });

    const result = await Effect.runPromise(
      updateWorkspace(stub.client, command)
    );

    expect(stub.rpc).toHaveBeenCalledExactlyOnceWith('update_workspace', {
      p_workspace_id: command.workspaceId,
      p_name: command.name,
      p_slug: command.slug,
      p_description: command.description,
    });
    expect(result).toEqual({
      id: command.workspaceId,
      name: command.name,
      slug: command.slug,
      description: command.description,
    });
  });

  it('omits an absent description from the RPC arguments', async () => {
    const stub = makeWorkspaceCommandClientStub({
      data: { ...updatedWorkspaceRow, description: null },
      error: null,
    });

    await Effect.runPromise(
      updateWorkspace(stub.client, { ...command, description: null })
    );

    expect(stub.rpc).toHaveBeenCalledExactlyOnceWith('update_workspace', {
      p_workspace_id: command.workspaceId,
      p_name: command.name,
      p_slug: command.slug,
    });
  });

  it.each([
    [
      'authentication',
      {
        code: '28000',
        message: 'Authentication is required to update a workspace',
      },
    ],
    [
      'owner authorization',
      {
        code: '42501',
        message: 'Only active workspace owners may update the workspace',
      },
    ],
    ['missing workspace', { code: 'P0002', message: 'Workspace not found' }],
    [
      'archived workspace',
      { code: '55000', message: 'Archived workspaces cannot be updated' },
    ],
  ])('maps %s failure to update-not-allowed', async (_label, error) => {
    const stub = makeWorkspaceCommandClientStub({ data: null, error });

    const result = await Effect.runPromise(
      updateWorkspace(stub.client, command).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toMatchObject({
        _tag: 'WorkspaceUpdateNotAllowedError',
        workspaceId: command.workspaceId,
      });
    }
  });

  it('maps the current-slug uniqueness constraint to a typed conflict', async () => {
    const stub = makeWorkspaceCommandClientStub({
      data: null,
      error: {
        code: '23505',
        message: 'duplicate key value violates unique constraint',
        details:
          'Key conflicts with constraint workspace_heads_current_slug_unique',
      },
    });

    const result = await Effect.runPromise(
      updateWorkspace(stub.client, command).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toMatchObject({
        _tag: 'WorkspaceSlugUnavailableError',
        slug: command.slug,
      });
    }
  });

  it('does not misclassify unrelated provider failures', async () => {
    const stub = makeWorkspaceCommandClientStub({
      data: null,
      error: { code: '55000', message: 'A different command failure' },
    });

    const result = await Effect.runPromise(
      updateWorkspace(stub.client, command).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('WorkspaceRepositoryUnavailableError');
    }
  });

  it.each([
    ['missing result', null],
    [
      'mismatched identity',
      {
        ...updatedWorkspaceRow,
        workspace_id: '00000000-0000-4000-8000-000000000099',
      },
    ],
    ['inactive result', { ...updatedWorkspaceRow, status: 'archived' }],
  ])('rejects an invalid %s at the adapter boundary', async (_label, data) => {
    const stub = makeWorkspaceCommandClientStub({ data, error: null });

    const result = await Effect.runPromise(
      updateWorkspace(stub.client, command).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('InvalidWorkspaceDataError');
    }
  });
});
