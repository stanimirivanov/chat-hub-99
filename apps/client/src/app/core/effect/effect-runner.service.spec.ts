import { TestBed } from '@angular/core/testing';
import { Effect } from 'effect';
import { beforeEach, describe, expect, it } from 'vitest';
import { EffectRunnerService } from './effect-runner.service';

describe('EffectRunnerService', () => {
  let runner: EffectRunnerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});

    runner = TestBed.inject(EffectRunnerService);
  });

  it('executes an Effect', async () => {
    const result = await runner.runPromise(Effect.succeed('success'));

    expect(result).toBe('success');
  });
});
