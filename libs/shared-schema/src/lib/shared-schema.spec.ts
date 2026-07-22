import { sharedSchema } from './shared-schema';

describe('sharedSchema', () => {
  it('should work', () => {
    expect(sharedSchema()).toEqual('shared-schema');
  })
})
