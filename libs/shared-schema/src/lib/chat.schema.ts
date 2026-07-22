import { Schema } from 'effect';

// Primitives & Refinements

export const UserIdSchema = Schema.String.pipe(
  Schema.minLength(1, { message: () => 'Must be at least 1 character.' }),
  Schema.maxLength(24, { message: () => 'Must be at most 24 characters.' })
);
export type UserId = Schema.Schema.Type<typeof UserIdSchema>;

export const UserNameSchema = Schema.String.pipe(
  Schema.minLength(1, { message: () => 'Must be at least 1 character.' }),
  Schema.maxLength(16, { message: () => 'Must be at most 16 characters.' })
);
export type UserName = Schema.Schema.Type<typeof UserNameSchema>;

export const MessageSchema = Schema.String.pipe(
  Schema.minLength(1, { message: () => 'Must be at least 1 character.' }),
  Schema.maxLength(1000, { message: () => 'Must be at most 1000 characters.' })
);
export type Message = Schema.Schema.Type<typeof MessageSchema>;

export const TimeSentSchema = Schema.Number;
export type TimeSent = Schema.Schema.Type<typeof TimeSentSchema>;

export const RoomNameSchemaRegex = /^\S+\w$/;

export const RoomNameSchema = Schema.String.pipe(
  Schema.minLength(2, { message: () => 'Must be at least 2 characters.' }),
  Schema.maxLength(16, { message: () => 'Must be at most 16 characters.' }),
  Schema.pattern(RoomNameSchemaRegex, {
    message: () => 'Must not contain spaces or special characters.',
  })
);
export type RoomName = Schema.Schema.Type<typeof RoomNameSchema>;

export const EventNameSchema = Schema.Literal('chat', 'kick_user', 'join_room');
export type EventName = Schema.Schema.Type<typeof EventNameSchema>;

export const SocketIdSchema = Schema.String.pipe(
  Schema.length(20, { message: () => 'Must be 20 characters.' })
);
export type SocketId = Schema.Schema.Type<typeof SocketIdSchema>;

// Core Domain Object Schemas

export const UserSchema = Schema.Struct({
  userId: UserIdSchema,
  userName: UserNameSchema,
  socketId: SocketIdSchema,
});
export type User = Schema.Schema.Type<typeof UserSchema>;

export const ChatMessageSchema = Schema.Struct({
  user: UserSchema,
  timeSent: TimeSentSchema,
  message: MessageSchema,
  roomName: RoomNameSchema,
  eventName: EventNameSchema,
});
export type ChatMessage = Schema.Schema.Type<typeof ChatMessageSchema>;

export const RoomSchema = Schema.Struct({
  name: RoomNameSchema,
  host: UserSchema,
  users: Schema.Array(UserSchema),
});
export type Room = Schema.Schema.Type<typeof RoomSchema>;

// Socket Event Data Schemas

export const JoinRoomSchema = Schema.Struct({
  user: UserSchema,
  roomName: RoomNameSchema,
  eventName: EventNameSchema,
});
export type JoinRoom = Schema.Schema.Type<typeof JoinRoomSchema>;

export const KickUserSchema = Schema.Struct({
  user: UserSchema,
  userToKick: UserSchema,
  roomName: RoomNameSchema,
  eventName: EventNameSchema,
});
export type KickUser = Schema.Schema.Type<typeof KickUserSchema>;
