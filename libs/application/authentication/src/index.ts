export type { AuthenticationSession } from './lib/authentication-session';

export {
  InvalidCredentialsError,
  AuthenticationUnavailableError,
  type AuthenticationOperation,
  type AuthenticationError,
} from './lib/authentication-error';

export {
  AuthenticationServiceTag,
  type AuthenticationService,
  type SignInCredentials,
} from './lib/authentication-service';

export { observeSessionChanges } from './lib/observe-session/observe-session';

export { restoreSession } from './lib/restore-session/restore-session';

export { signIn, type SignInInput } from './lib/sign-in/sign-in';

export { signOut } from './lib/sign-out/sign-out';
