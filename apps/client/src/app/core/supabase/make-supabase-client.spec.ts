import { describe, expect, it } from 'vitest';
import { makeSupabaseClient } from './make-supabase-client';

describe('makeSupabaseClient', () => {
  it('creates a Supabase client', () => {
    const client = makeSupabaseClient({
      url: 'http://127.0.0.1:54321',

      publishableKey: 'test-publishable-key',
    });

    expect(client).toBeDefined();

    expect(client.auth).toBeDefined();

    expect(client.from).toBeTypeOf('function');

    expect(client.rpc).toBeTypeOf('function');
  });
});
