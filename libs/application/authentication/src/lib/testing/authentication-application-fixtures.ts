import { Schema } from 'effect';
import { AuthenticationSessionSchema } from '../authentication-session';

export const authenticationSession = Schema.decodeUnknownSync(
  AuthenticationSessionSchema
)({
  userId: '00000000-0000-4000-8000-000000000001',
  email: 'owner@chat-hub.local',
});
