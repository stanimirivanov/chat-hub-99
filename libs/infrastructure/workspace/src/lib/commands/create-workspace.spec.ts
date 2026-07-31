import { Effect, Either } from 'effect';
import { describe, expect, it } from 'vitest';
import type { CreateWorkspaceCommand } from '@chat-hub/application/workspace';
import {
  createdWorkspaceRow,
  makeWorkspaceCommandClientStub,
} from '../testing';
import { createWorkspace } from './create-workspace';

const command: CreateWorkspaceCommand = {
  name: 'Product Design',
  slug: 'product-design',
  description: null,
};

describe('createWorkspace', () => {
  it('executes the RPC and returns its validated workspace projection', async () => {
    const stub = makeWorkspaceCommandClientStub({
      data: createdWorkspaceRow,
      error: null,
    });

    const result = await Effect.runPromise(
      createWorkspace(stub.client, command)
    );

    expect(stub.rpc).toHaveBeenCalledExactlyOnceWith('create_workspace', {
      p_name: 'Product Design',
      p_slug: 'product-design',
    });
    expect(result).toEqual({
      id: createdWorkspaceRow.workspace_id,
      name: 'Product Design',
      slug: 'product-design',
      description: null,
    });
  });

  it('includes a present description in the RPC arguments', async () => {
    const stub = makeWorkspaceCommandClientStub({
      data: {
        ...createdWorkspaceRow,
        description: 'Design collaboration',
      },
      error: null,
    });

    await Effect.runPromise(
      createWorkspace(stub.client, {
        ...command,
        description: 'Design collaboration',
      })
    );

    expect(stub.rpc).toHaveBeenCalledExactlyOnceWith('create_workspace', {
      p_name: 'Product Design',
      p_slug: 'product-design',
      p_description: 'Design collaboration',
    });
  });

  it('maps the current-slug uniqueness constraint to a typed conflict', async () => {
    const stub = makeWorkspaceCommandClientStub({
      data: null,
      error: {
        code: '23505',
        message:
          'duplicate key value violates unique constraint "workspace_heads_current_slug_unique"',
      },
    });

    const result = await Effect.runPromise(
      createWorkspace(stub.client, command).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toMatchObject({
        _tag: 'WorkspaceSlugUnavailableError',
        slug: 'product-design',
      });
    }
  });

  it('does not misclassify unrelated uniqueness failures', async () => {
    const stub = makeWorkspaceCommandClientStub({
      data: null,
      error: {
        code: '23505',
        message:
          'duplicate key value violates unique constraint "workspace_versions_workspace_version_unique"',
      },
    });

    const result = await Effect.runPromise(
      createWorkspace(stub.client, command).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('WorkspaceRepositoryUnavailableError');
    }
  });

  it('rejects a missing RPC result at the infrastructure boundary', async () => {
    const stub = makeWorkspaceCommandClientStub({
      data: null,
      error: null,
    });

    const result = await Effect.runPromise(
      createWorkspace(stub.client, command).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('InvalidWorkspaceDataError');
    }
  });
});
