export {
  AuthenticationSessionSchema,
  type AuthenticationSession,
} from './lib/authentication-session';

export {
  InvalidCredentialsError,
  InvalidSignInInputError,
  AuthenticationUnavailableError,
  type AuthenticationOperation,
  type AuthenticationError,
} from './lib/authentication-error';

export {
  AuthenticationServiceTag,
  type AuthenticationService,
  type SignInCredentials,
} from './lib/authentication-service';

export { observeSessionChanges } from './lib/observe-session';

export { restoreSession } from './lib/restore-session';

export { signIn, type SignInInput } from './lib/sign-in';

export { signOut } from './lib/sign-out';
