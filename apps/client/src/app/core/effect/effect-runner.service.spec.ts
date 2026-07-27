import { TestBed } from '@angular/core/testing';
import { Effect } from 'effect';
import { EffectRunner } from './effect-runner.service';

describe('EffectRunner', () => {
  let runner: EffectRunner;

  beforeEach(() => {
    TestBed.configureTestingModule({});

    runner = TestBed.inject(EffectRunner);
  });

  it('executes an Effect', async () => {
    const result = await runner.runPromise(Effect.succeed('ok'));

    expect(result).toBe('ok');
  });
});
