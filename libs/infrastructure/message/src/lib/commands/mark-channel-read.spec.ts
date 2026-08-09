import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import { markChannelRead } from './mark-channel-read';
import { channelId, makeRpcClientStub, messageId } from '../testing';

describe('markChannelRead', () => {
  it('executes the scoped read-position command', async () => {
    const { client, rpc } = makeRpcClientStub({ data: null, error: null });

    await Effect.runPromise(markChannelRead(client, { channelId, messageId }));

    expect(rpc).toHaveBeenCalledWith('mark_channel_read', {
      p_channel_id: channelId,
      p_message_id: messageId,
    });
  });

  it('translates provider failures', async () => {
    const { client } = makeRpcClientStub({
      data: null,
      error: {
        code: '42501',
        message: 'denied',
        details: '',
        hint: '',
      },
    });

    const error = await Effect.runPromise(
      markChannelRead(client, { channelId, messageId }).pipe(Effect.flip)
    );

    expect(error._tag).toBe('MessageAccessDeniedError');
  });
});
