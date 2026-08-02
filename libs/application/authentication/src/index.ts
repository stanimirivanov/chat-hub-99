export {
  AuthenticationSessionSchema,
  type AuthenticationSession,
} from './lib/authentication-session';

export {
  InvalidCredentialsError,
  InvalidSignInInputError,
  InvalidSignUpInputError,
  AccountAlreadyRegisteredError,
  AuthenticationUnavailableError,
  type AuthenticationOperation,
  type AuthenticationError,
} from './lib/authentication-error';

export {
  AuthenticationServiceTag,
  type AuthenticationService,
  type SignUpResult,
} from './lib/authentication-service';

export type { EmailPasswordCredentials } from './lib/email-password-credentials';

export { observeSessionChanges } from './lib/observe-session';

export { restoreSession } from './lib/restore-session';

export { signIn, type SignInInput } from './lib/sign-in';

export { signUp, type SignUpInput } from './lib/sign-up';

export { signOut } from './lib/sign-out';
