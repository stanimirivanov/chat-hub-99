import { Effect, Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import type { SearchWorkspaceMessagesResult } from '@omoikane/shared/database';
import { WorkspaceIdSchema } from '@omoikane/domain/workspace';
import { searchWorkspaceMessages } from './search-workspace-messages';
import {
  activeMessageRow,
  authorId,
  channelId,
  makeRpcClientStub,
  makeThrowingRpcClientStub,
  messageId,
} from '../testing';

const searchRow: SearchWorkspaceMessagesResult[number] = {
  ...activeMessageRow,
  author_user_id: authorId,
  channel_id: channelId,
  content: 'Hello',
  created_at: '2026-07-26T18:00:00.000Z',
  is_edited: false,
  message_id: messageId,
  message_status: 'active',
  message_version_id: '00000000-0000-4000-8000-000000000040',
  updated_at: '2026-07-26T18:00:00.000Z',
  version_created_at: '2026-07-26T18:00:00.000Z',
  version_created_by: authorId,
  version_number: 1,
  workspace_id: '00000000-0000-4000-8000-000000000050',
  channel_name: 'Planning',
  channel_slug: 'planning',
  search_rank: 0.25,
};

const workspaceId = Schema.decodeUnknownSync(WorkspaceIdSchema)(
  activeMessageRow.workspace_id
);

describe('searchWorkspaceMessages', () => {
  it('executes the fixed-cap RPC and validates its results', async () => {
    const { client, rpc } = makeRpcClientStub({
      data: [searchRow],
      error: null,
    });

    const results = await Effect.runPromise(
      searchWorkspaceMessages(client, {
        workspaceId,
        query: 'project decision',
      })
    );

    expect(rpc).toHaveBeenCalledWith('search_workspace_messages', {
      p_workspace_id: activeMessageRow.workspace_id,
      p_search_query: 'project decision',
      p_limit: 20,
    });
    expect(results).toEqual([
      {
        message: expect.objectContaining({
          id: activeMessageRow.message_id,
          content: 'Hello',
        }),
        channel: {
          id: activeMessageRow.channel_id,
          name: 'Planning',
          slug: 'planning',
        },
      },
    ]);
  });

  it('maps provider errors', async () => {
    const { client } = makeRpcClientStub<SearchWorkspaceMessagesResult>({
      data: [],
      error: {
        code: '42501',
        message: 'permission denied',
        details: '',
        hint: '',
      },
    });

    const error = await Effect.runPromise(
      searchWorkspaceMessages(client, {
        workspaceId,
        query: 'decision',
      }).pipe(Effect.flip)
    );

    expect(error._tag).toBe('MessageAccessDeniedError');
  });

  it('maps thrown request failures', async () => {
    const error = await Effect.runPromise(
      searchWorkspaceMessages(
        makeThrowingRpcClientStub(new TypeError('Failed to fetch')),
        {
          workspaceId,
          query: 'decision',
        }
      ).pipe(Effect.flip)
    );

    expect(error._tag).toBe('MessageRepositoryUnavailableError');
  });
});
