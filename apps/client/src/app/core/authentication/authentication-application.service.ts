import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { Effect, Either, Fiber, Stream } from 'effect';
import {
  observeSessionChanges,
  resendConfirmationEmail,
  requestPasswordReset,
  restoreSession,
  signIn,
  signUp,
  signOut,
  updatePassword,
  type AuthenticationError,
  type AuthenticationSession,
  type AuthenticationSessionChange,
  type SignInInput,
  type SignUpInput,
  type SignUpResult,
  type UpdatePasswordInput,
} from '@chat-hub/application/authentication';
import { applicationRuntime } from '../effect/application-runtime';
import { logAuthenticationError } from './log-authentication-error';

/**
 * Angular execution boundary for authentication application programs.
 *
 * Application use cases build lazy Effects. This service executes them using
 * the composed runtime and exposes Angular-friendly Promises and callbacks.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthenticationApplicationService {
  private readonly document = inject(DOCUMENT);

  private rootCallbackUrl(): string {
    return new URL('/', this.document.location.origin).toString();
  }

  /**
   * Restores the persisted browser session.
   */
  restoreSession(): Promise<
    Either.Either<AuthenticationSession | null, AuthenticationError>
  > {
    const program = restoreSession.pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          logAuthenticationError('restore-session', error);
        })
      ),
      Effect.either
    );

    return applicationRuntime.runPromise(program);
  }

  /**
   * Executes email/password sign-in.
   *
   * Credentials are deliberately not included in diagnostic output.
   */
  signIn(
    input: SignInInput
  ): Promise<Either.Either<AuthenticationSession, AuthenticationError>> {
    const program = signIn(input).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          logAuthenticationError('sign-in', error);
        })
      ),
      Effect.either
    );

    return applicationRuntime.runPromise(program);
  }

  /**
   * Executes email/password account registration.
   *
   * The result preserves whether the provider created an immediate session or
   * requires email confirmation. Credentials never enter diagnostic output.
   */
  signUp(
    input: SignUpInput
  ): Promise<Either.Either<SignUpResult, AuthenticationError>> {
    const program = signUp(input).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          logAuthenticationError('sign-up', error);
        })
      ),
      Effect.either
    );

    return applicationRuntime.runPromise(program);
  }

  /** Resends confirmation for an account awaiting email verification. */
  resendConfirmationEmail(
    email: string
  ): Promise<Either.Either<void, AuthenticationError>> {
    const program = resendConfirmationEmail({
      email,
      redirectUrl: this.rootCallbackUrl(),
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          logAuthenticationError('resend-confirmation-email', error);
        })
      ),
      Effect.either
    );

    return applicationRuntime.runPromise(program);
  }

  /**
   * Requests a password-reset email with a callback to this browser origin.
   *
   * Constructing the absolute URL belongs here because the application use
   * case has no browser globals. The callback returns to the root shell, whose
   * Auth listener selects recovery mode from the provider event.
   */
  requestPasswordReset(
    email: string
  ): Promise<Either.Either<void, AuthenticationError>> {
    const program = requestPasswordReset({
      email,
      redirectUrl: this.rootCallbackUrl(),
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          logAuthenticationError('request-password-reset', error);
        })
      ),
      Effect.either
    );

    return applicationRuntime.runPromise(program);
  }

  /** Updates the password belonging to the active recovery session. */
  updatePassword(
    input: UpdatePasswordInput
  ): Promise<Either.Either<void, AuthenticationError>> {
    const program = updatePassword(input).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          logAuthenticationError('update-password', error);
        })
      ),
      Effect.either
    );

    return applicationRuntime.runPromise(program);
  }

  /**
   * Ends the current browser session.
   */
  signOut(): Promise<Either.Either<void, AuthenticationError>> {
    const program = signOut.pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          logAuthenticationError('sign-out', error);
        })
      ),
      Effect.either
    );

    return applicationRuntime.runPromise(program);
  }

  /**
   * Starts observing provider session changes.
   *
   * The returned cleanup function interrupts the running stream Fiber.
   */
  observeSessionChanges(
    onSessionChange: (change: AuthenticationSessionChange) => void,
    onError: (error: AuthenticationError) => void
  ): () => void {
    const program = observeSessionChanges.pipe(
      Stream.runForEach((change) =>
        Effect.sync(() => {
          onSessionChange(change);
        })
      ),

      Effect.catchAll((error) =>
        Effect.sync(() => {
          logAuthenticationError('observe-session', error);

          onError(error);
        })
      )
    );

    const fiber = applicationRuntime.runFork(program);

    return () => {
      void applicationRuntime.runPromise(Fiber.interrupt(fiber));
    };
  }
}
