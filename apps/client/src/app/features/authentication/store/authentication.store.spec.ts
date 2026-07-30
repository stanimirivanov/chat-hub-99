import { Either } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import {
  AuthenticationUnavailableError,
  InvalidCredentialsError,
  type AuthenticationError,
  type AuthenticationSession,
} from '@chat-hub/application/authentication';
import { AuthenticationApplicationService } from '../../../core/authentication/authentication-application.service';
import { AuthenticationStore } from './authentication.store';

const session: AuthenticationSession = {
  userId: '00000000-0000-4000-8000-000000000001',
  email: 'owner@chat-hub.local',
};

const configureStore = (
  overrides: Partial<{
    restoreSession: AuthenticationApplicationService['restoreSession'];

    signIn: AuthenticationApplicationService['signIn'];

    signOut: AuthenticationApplicationService['signOut'];

    observeSessionChanges: AuthenticationApplicationService['observeSessionChanges'];
  }> = {}
) => {
  const stopObserving = vi.fn();

  const service = {
    restoreSession: vi.fn().mockResolvedValue(Either.right(null)),

    signIn: vi.fn().mockResolvedValue(Either.right(session)),

    signOut: vi.fn().mockResolvedValue(Either.right(undefined)),

    observeSessionChanges: vi.fn().mockReturnValue(stopObserving),

    ...overrides,
  };

  TestBed.configureTestingModule({
    providers: [
      AuthenticationStore,
      {
        provide: AuthenticationApplicationService,
        useValue: service,
      },
    ],
  });

  return {
    store: TestBed.inject(AuthenticationStore),
    service,
    stopObserving,
  };
};

describe('AuthenticationStore', () => {
  it('starts as initializing', () => {
    const { store } = configureStore();

    expect(store.status()).toBe('initializing');

    expect(store.session()).toBeNull();

    expect(store.isInitializing()).toBe(true);
  });

  it('becomes anonymous without a restored session', async () => {
    const { store } = configureStore();

    await store.initialize();

    expect(store.status()).toBe('anonymous');

    expect(store.session()).toBeNull();
  });

  it('restores an authenticated session', async () => {
    const { store } = configureStore({
      restoreSession: vi.fn().mockResolvedValue(Either.right(session)),
    });

    await store.initialize();

    expect(store.status()).toBe('authenticated');

    expect(store.session()).toEqual(session);
  });

  it('exposes a restoration failure and remains anonymous', async () => {
    const failure = new AuthenticationUnavailableError({
      operation: 'restore-session',
      cause: new Error('Provider unavailable'),
    });

    const { store } = configureStore({
      restoreSession: vi.fn().mockResolvedValue(Either.left(failure)),
    });

    await store.initialize();

    expect(store.status()).toBe('anonymous');

    expect(store.session()).toBeNull();

    expect(store.error()).toEqual({
      message: 'Authentication is currently unavailable. Please try again.',
    });
  });

  it('initializes and subscribes only once', async () => {
    const restoreSession = vi.fn().mockResolvedValue(Either.right(null));

    const observeSessionChanges = vi.fn().mockReturnValue(() => undefined);

    const { store } = configureStore({
      restoreSession,
      observeSessionChanges,
    });

    await Promise.all([
      store.initialize(),
      store.initialize(),
      store.initialize(),
    ]);

    expect(restoreSession).toHaveBeenCalledOnce();

    expect(observeSessionChanges).toHaveBeenCalledOnce();
  });

  it('applies observed session changes', async () => {
    let onSessionChange:
      | ((value: AuthenticationSession | null) => void)
      | undefined;

    const observeSessionChanges = vi.fn(
      (onChange: (value: AuthenticationSession | null) => void) => {
        onSessionChange = onChange;

        return () => undefined;
      }
    );

    const { store } = configureStore({
      observeSessionChanges,
    });

    await store.initialize();

    onSessionChange?.(session);

    expect(store.status()).toBe('authenticated');

    expect(store.session()).toEqual(session);

    onSessionChange?.(null);

    expect(store.status()).toBe('anonymous');

    expect(store.session()).toBeNull();
  });

  it('exposes session observation failures', async () => {
    let onObservationError: ((error: AuthenticationError) => void) | undefined;

    const observeSessionChanges = vi.fn(
      (
        _onChange: (value: AuthenticationSession | null) => void,
        onError: (error: AuthenticationError) => void
      ) => {
        onObservationError = onError;

        return () => undefined;
      }
    );

    const { store } = configureStore({
      observeSessionChanges,
    });

    await store.initialize();

    onObservationError?.(
      new AuthenticationUnavailableError({
        operation: 'observe-session',
        cause: new Error('Listener failed'),
      })
    );

    expect(store.error()).toEqual({
      message: 'Authentication is currently unavailable. Please try again.',
    });
  });

  it('authenticates after successful sign-in', async () => {
    const signIn = vi.fn().mockResolvedValue(Either.right(session));

    const { store } = configureStore({
      signIn,
    });

    await store.initialize();

    const result = await store.signIn('owner@chat-hub.local', 'Password123!');

    expect(result).toBe(true);

    expect(store.status()).toBe('authenticated');

    expect(store.session()).toEqual(session);

    expect(store.signInStatus()).toBe('idle');
  });

  it('exposes invalid credentials', async () => {
    const signIn = vi
      .fn()
      .mockResolvedValue(Either.left(new InvalidCredentialsError()));

    const { store } = configureStore({
      signIn,
    });

    await store.initialize();

    const result = await store.signIn('owner@chat-hub.local', 'wrong-password');

    expect(result).toBe(false);

    expect(store.signInStatus()).toBe('failed');

    expect(store.error()).toEqual({
      message: 'The email or password is incorrect.',
    });
  });

  it('prevents duplicate pending sign-in requests', async () => {
    let resolveSignIn:
      | ((
          value: Either.Either<AuthenticationSession, AuthenticationError>
        ) => void)
      | undefined;

    const pendingSignIn = new Promise<
      Either.Either<AuthenticationSession, AuthenticationError>
    >((resolve) => {
      resolveSignIn = resolve;
    });

    const signIn = vi.fn().mockReturnValue(pendingSignIn);

    const { store } = configureStore({
      signIn,
    });

    await store.initialize();

    const firstResult = store.signIn('owner@chat-hub.local', 'Password123!');

    expect(store.signInStatus()).toBe('pending');

    const duplicateResult = await store.signIn(
      'owner@chat-hub.local',
      'Password123!'
    );

    expect(duplicateResult).toBe(false);

    expect(signIn).toHaveBeenCalledOnce();

    resolveSignIn?.(Either.right(session));

    await expect(firstResult).resolves.toBe(true);
  });

  it('does not complete sign-in solely because a session event arrived', async () => {
    let onSessionChange:
      | ((value: AuthenticationSession | null) => void)
      | undefined;

    let resolveSignIn:
      | ((
          value: Either.Either<AuthenticationSession, AuthenticationError>
        ) => void)
      | undefined;

    const pendingSignIn = new Promise<
      Either.Either<AuthenticationSession, AuthenticationError>
    >((resolve) => {
      resolveSignIn = resolve;
    });

    const { store } = configureStore({
      signIn: vi.fn().mockReturnValue(pendingSignIn),

      observeSessionChanges: vi.fn(
        (onChange: (value: AuthenticationSession | null) => void) => {
          onSessionChange = onChange;

          return () => undefined;
        }
      ),
    });

    await store.initialize();

    const result = store.signIn('owner@chat-hub.local', 'Password123!');

    onSessionChange?.(session);

    expect(store.signInStatus()).toBe('pending');

    resolveSignIn?.(Either.right(session));

    await expect(result).resolves.toBe(true);

    expect(store.signInStatus()).toBe('idle');
  });

  it('does not let a stale sign-in result replace a newer observed session', async () => {
    const newerSession: AuthenticationSession = {
      userId: '00000000-0000-4000-8000-000000000002',
      email: 'newer@chat-hub.local',
    };

    let onSessionChange:
      | ((value: AuthenticationSession | null) => void)
      | undefined;

    let resolveSignIn:
      | ((
          value: Either.Either<AuthenticationSession, AuthenticationError>
        ) => void)
      | undefined;

    const pendingSignIn = new Promise<
      Either.Either<AuthenticationSession, AuthenticationError>
    >((resolve) => {
      resolveSignIn = resolve;
    });

    const { store } = configureStore({
      signIn: vi.fn().mockReturnValue(pendingSignIn),

      observeSessionChanges: vi.fn(
        (onChange: (value: AuthenticationSession | null) => void) => {
          onSessionChange = onChange;

          return () => undefined;
        }
      ),
    });

    await store.initialize();

    const result = store.signIn('owner@chat-hub.local', 'Password123!');

    onSessionChange?.(newerSession);

    resolveSignIn?.(Either.right(session));

    await expect(result).resolves.toBe(true);

    expect(store.session()).toEqual(newerSession);
  });

  it('becomes anonymous after sign-out', async () => {
    const { store } = configureStore({
      restoreSession: vi.fn().mockResolvedValue(Either.right(session)),
    });

    await store.initialize();

    const result = await store.signOut();

    expect(result).toBe(true);

    expect(store.status()).toBe('anonymous');

    expect(store.session()).toBeNull();

    expect(store.signOutStatus()).toBe('idle');
  });

  it('preserves the session after failed sign-out', async () => {
    const failure = new AuthenticationUnavailableError({
      operation: 'sign-out',
      cause: new Error('Provider unavailable'),
    });

    const { store } = configureStore({
      restoreSession: vi.fn().mockResolvedValue(Either.right(session)),

      signOut: vi.fn().mockResolvedValue(Either.left(failure)),
    });

    await store.initialize();

    const result = await store.signOut();

    expect(result).toBe(false);

    expect(store.status()).toBe('authenticated');

    expect(store.session()).toEqual(session);

    expect(store.signOutStatus()).toBe('failed');
  });

  it('does not let a stale sign-out result clear a newer observed session', async () => {
    const newerSession: AuthenticationSession = {
      userId: '00000000-0000-4000-8000-000000000002',
      email: 'newer@chat-hub.local',
    };

    let onSessionChange:
      | ((value: AuthenticationSession | null) => void)
      | undefined;

    let resolveSignOut:
      | ((value: Either.Either<void, AuthenticationError>) => void)
      | undefined;

    const pendingSignOut = new Promise<
      Either.Either<void, AuthenticationError>
    >((resolve) => {
      resolveSignOut = resolve;
    });

    const { store } = configureStore({
      restoreSession: vi.fn().mockResolvedValue(Either.right(session)),

      signOut: vi.fn().mockReturnValue(pendingSignOut),

      observeSessionChanges: vi.fn(
        (onChange: (value: AuthenticationSession | null) => void) => {
          onSessionChange = onChange;

          return () => undefined;
        }
      ),
    });

    await store.initialize();

    const result = store.signOut();

    onSessionChange?.(newerSession);

    resolveSignOut?.(Either.right(undefined));

    await expect(result).resolves.toBe(true);

    expect(store.session()).toEqual(newerSession);

    expect(store.signOutStatus()).toBe('idle');
  });

  it('unsubscribes when its injection context is destroyed', async () => {
    const { store, stopObserving } = configureStore();

    await store.initialize();

    TestBed.resetTestingModule();

    expect(stopObserving).toHaveBeenCalledOnce();
  });
});
