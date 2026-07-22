import { describe, it, expect } from 'vitest';
import { Schema, Either } from 'effect';
import {
  UserSchema,
  ChatMessageSchema,
  RoomNameSchema,
  JoinRoomSchema,
  KickUserSchema,
} from './chat.schema';

describe('Shared Schema Validation (Exact Refinements)', () => {
  const validUser = {
    userId: 'u123',
    userName: 'Alice',
    socketId: '12345678901234567890', // Exactly 20 chars
  };

  describe('RoomNameSchema Constraints', () => {
    it('should accept valid room names', () => {
      const result = Schema.decodeUnknownEither(RoomNameSchema)('general');
      expect(Either.isRight(result)).toBe(true);
    });

    it('should reject room names with spaces or invalid special chars', () => {
      const result = Schema.decodeUnknownEither(RoomNameSchema)('room name');
      expect(Either.isLeft(result)).toBe(true);
    });

    it('should reject room names under 2 chars', () => {
      const result = Schema.decodeUnknownEither(RoomNameSchema)('a');
      expect(Either.isLeft(result)).toBe(true);
    });
  });

  describe('UserSchema Constraints', () => {
    it('should pass valid user', () => {
      const result = Schema.decodeUnknownEither(UserSchema)(validUser);
      expect(Either.isRight(result)).toBe(true);
    });

    it('should fail if socketId is not exactly 20 characters', () => {
      const invalidUser = { ...validUser, socketId: 'short-socket' };
      const result = Schema.decodeUnknownEither(UserSchema)(invalidUser);
      expect(Either.isLeft(result)).toBe(true);
    });
  });

  describe('ChatMessageSchema Constraints', () => {
    it('should parse valid full chat message', () => {
      const validMsg = {
        user: validUser,
        timeSent: Date.now(),
        message: 'Hello world!',
        roomName: 'general',
        eventName: 'chat' as const,
      };

      const result = Schema.decodeUnknownEither(ChatMessageSchema)(validMsg);
      expect(Either.isRight(result)).toBe(true);
    });
  });

  describe('JoinRoom & KickUser Schemas', () => {
    it('should parse valid JoinRoom payload', () => {
      const payload = {
        user: validUser,
        roomName: 'angular18',
        eventName: 'join_room' as const,
      };

      const result = Schema.decodeUnknownEither(JoinRoomSchema)(payload);
      expect(Either.isRight(result)).toBe(true);
    });

    it('should parse valid KickUser payload', () => {
      const payload = {
        user: validUser,
        userToKick: { ...validUser, userId: 'u999', userName: 'Bob' },
        roomName: 'angular18',
        eventName: 'kick_user' as const,
      };

      const result = Schema.decodeUnknownEither(KickUserSchema)(payload);
      expect(Either.isRight(result)).toBe(true);
    });
  });
});
