import { Effect, Either, Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import type { CreateChannelCommand } from '@omoikane/application/channel';
import { WorkspaceIdSchema } from '@omoikane/domain/workspace';
import { makeChannelCommandClientStub } from '../testing';
import { createChannel } from './create-channel';

const command: CreateChannelCommand = {
  workspaceId: Schema.decodeUnknownSync(WorkspaceIdSchema)(
    '00000000-0000-4000-8000-000000000002'
  ),
  name: 'Product Design',
  slug: 'product-design',
  description: null,
};

const createdChannelId = '00000000-0000-4000-8000-000000000001';

describe('createChannel', () => {
  it('executes the RPC and returns its validated channel identity', async () => {
    const stub = makeChannelCommandClientStub({
      data: createdChannelId,
      error: null,
    });

    const result = await Effect.runPromise(createChannel(stub.client, command));

    expect(stub.rpc).toHaveBeenCalledExactlyOnceWith('create_channel', {
      p_workspace_id: command.workspaceId,
      p_name: 'Product Design',
      p_slug: 'product-design',
    });
    expect(result).toBe(createdChannelId);
  });

  it('includes a present description in the RPC arguments', async () => {
    const stub = makeChannelCommandClientStub({
      data: createdChannelId,
      error: null,
    });

    await Effect.runPromise(
      createChannel(stub.client, {
        ...command,
        description: 'Design collaboration',
      })
    );

    expect(stub.rpc).toHaveBeenCalledExactlyOnceWith('create_channel', {
      p_workspace_id: command.workspaceId,
      p_name: 'Product Design',
      p_slug: 'product-design',
      p_description: 'Design collaboration',
    });
  });

  it('maps the RPC slug conflict to a typed failure', async () => {
    const stub = makeChannelCommandClientStub({
      data: null,
      error: {
        code: '23505',
        message: `Channel slug "product-design" already exists in workspace ${command.workspaceId}`,
      },
    });

    const result = await Effect.runPromise(
      createChannel(stub.client, command).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toMatchObject({
        _tag: 'ChannelSlugUnavailableError',
        workspaceId: command.workspaceId,
        slug: 'product-design',
      });
    }
  });

  it('maps authorization failures without exposing PostgREST', async () => {
    const stub = makeChannelCommandClientStub({
      data: null,
      error: {
        code: '42501',
        message: 'Only active workspace members may create channels',
      },
    });

    const result = await Effect.runPromise(
      createChannel(stub.client, command).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toMatchObject({
        _tag: 'ChannelCreationNotAllowedError',
        workspaceId: command.workspaceId,
      });
    }
  });

  it('does not misclassify unrelated uniqueness failures', async () => {
    const stub = makeChannelCommandClientStub({
      data: null,
      error: {
        code: '23505',
        message: 'duplicate channel version number',
      },
    });

    const result = await Effect.runPromise(
      createChannel(stub.client, command).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('ChannelRepositoryUnavailableError');
    }
  });

  it('rejects a missing or invalid RPC identity', async () => {
    const stub = makeChannelCommandClientStub({
      data: null,
      error: null,
    });

    const result = await Effect.runPromise(
      createChannel(stub.client, command).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('InvalidChannelDataError');
    }
  });
});
