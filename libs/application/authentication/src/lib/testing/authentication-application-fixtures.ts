import { Schema } from 'effect';
import { AuthenticationSessionSchema } from '../authentication-session';
import type { AuthenticationSessionChange } from '../authentication-session';
import type { SignUpResult } from '../authentication-service';

export const authenticationSession = Schema.decodeUnknownSync(
  AuthenticationSessionSchema
)({
  userId: '00000000-0000-4000-8000-000000000001',
  email: 'owner@omoikane.local',
});

export const authenticatedSignUpResult = {
  status: 'authenticated',
  session: authenticationSession,
} satisfies SignUpResult;

export const confirmationRequiredSignUpResult = {
  status: 'confirmation-required',
  email: 'new-user@example.com',
} satisfies SignUpResult;

export const authenticatedSessionChange = {
  type: 'session',
  session: authenticationSession,
} satisfies AuthenticationSessionChange;

export const passwordRecoverySessionChange = {
  type: 'password-recovery',
  session: authenticationSession,
} satisfies AuthenticationSessionChange;

export const signedOutSessionChange = {
  type: 'session',
  session: null,
} satisfies AuthenticationSessionChange;
