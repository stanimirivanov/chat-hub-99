import { Effect, Either } from 'effect';
import { describe, expect, it } from 'vitest';
import { PasswordUnchangedError } from '../authentication-error';
import { makeUpdatePasswordAuthenticationService } from '../testing';
import { updatePassword, type UpdatePasswordInput } from './update-password';

const externalInput = (input: unknown) =>
  updatePassword(input as UpdatePasswordInput);

describe('updatePassword', () => {
  it('preserves matching password content and delegates once', async () => {
    const { updatePassword: update, serviceLayer } =
      makeUpdatePasswordAuthenticationService(() => Effect.void);

    await Effect.runPromise(
      updatePassword({
        password: '  NewPassword123!  ',
        passwordConfirmation: '  NewPassword123!  ',
      }).pipe(Effect.provide(serviceLayer))
    );

    expect(update).toHaveBeenCalledExactlyOnceWith('  NewPassword123!  ');
  });

  it('propagates a typed provider rejection unchanged', async () => {
    const failure = new PasswordUnchangedError();
    const { serviceLayer } = makeUpdatePasswordAuthenticationService(() =>
      Effect.fail(failure)
    );

    const result = await Effect.runPromise(
      updatePassword({
        password: 'Password123!',
        passwordConfirmation: 'Password123!',
      }).pipe(Effect.provide(serviceLayer), Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toBe(failure);
    }
  });

  it.each([
    { input: undefined, field: 'password' as const },
    { input: null, field: 'password' as const },
    {
      input: { password: '', passwordConfirmation: '' },
      field: 'password' as const,
    },
    {
      input: { password: 'NewPassword123!', passwordConfirmation: null },
      field: 'passwordConfirmation' as const,
    },
    {
      input: {
        password: 'NewPassword123!',
        passwordConfirmation: 'DifferentPassword123!',
      },
      field: 'passwordConfirmation' as const,
    },
  ])(
    'rejects invalid $field input before delegation',
    async ({ input, field }) => {
      const { updatePassword: update, serviceLayer } =
        makeUpdatePasswordAuthenticationService(() => Effect.void);

      const result = await Effect.runPromise(
        externalInput(input).pipe(Effect.provide(serviceLayer), Effect.either)
      );

      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left).toMatchObject({
          _tag: 'InvalidPasswordUpdateInputError',
          field,
        });
      }
      expect(update).not.toHaveBeenCalled();
    }
  );
});
