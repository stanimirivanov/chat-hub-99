import { Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import { ChannelSchema } from './channel';

const decodeChannel = Schema.decodeUnknownEither(ChannelSchema);

describe('ChannelSchema', () => {
  it('accepts an active navigation projection', () => {
    const result = decodeChannel({
      id: '00000000-0000-4000-8000-000000000001',
      workspaceId: '00000000-0000-4000-8000-000000000002',
      name: 'General',
      slug: 'general',
      description: null,
    });

    expect(result._tag).toBe('Right');
  });

  it.each([
    ['missing identity', { id: null }],
    ['missing workspace identity', { workspaceId: null }],
    ['blank name', { name: '   ' }],
    ['invalid slug', { slug: 'General Channel' }],
  ])('rejects %s', (_label, invalidField) => {
    const result = decodeChannel({
      id: '00000000-0000-4000-8000-000000000001',
      workspaceId: '00000000-0000-4000-8000-000000000002',
      name: 'General',
      slug: 'general',
      description: null,
      ...invalidField,
    });

    expect(result._tag).toBe('Left');
  });
});
