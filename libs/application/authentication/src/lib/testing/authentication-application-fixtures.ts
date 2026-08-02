import { Schema } from 'effect';
import { AuthenticationSessionSchema } from '../authentication-session';
import type { SignUpResult } from '../authentication-service';

export const authenticationSession = Schema.decodeUnknownSync(
  AuthenticationSessionSchema
)({
  userId: '00000000-0000-4000-8000-000000000001',
  email: 'owner@chat-hub.local',
});

export const authenticatedSignUpResult = {
  status: 'authenticated',
  session: authenticationSession,
} satisfies SignUpResult;

export const confirmationRequiredSignUpResult = {
  status: 'confirmation-required',
} satisfies SignUpResult;
