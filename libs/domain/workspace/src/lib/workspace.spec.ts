import { Either, Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import { WorkspaceSchema } from './workspace';

const decodeWorkspace = Schema.decodeUnknownEither(WorkspaceSchema);

describe('WorkspaceSchema', () => {
  it('decodes an active navigation projection', () => {
    const result = decodeWorkspace({
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Chat Hub Development',
      slug: 'chat-hub-development',
      description: null,
    });

    expect(Either.isRight(result)).toBe(true);
  });

  it.each([
    { field: 'id', value: 'not-a-uuid' },
    { field: 'name', value: '   ' },
    { field: 'slug', value: 'Not Normalized' },
  ])('rejects an invalid $field', ({ field, value }) => {
    const result = decodeWorkspace({
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Chat Hub Development',
      slug: 'chat-hub-development',
      description: null,
      [field]: value,
    });

    expect(Either.isLeft(result)).toBe(true);
  });
});
