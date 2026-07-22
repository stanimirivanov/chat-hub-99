import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { UsePipes, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import {
  ChatMessageSchema,
  ChatMessage,
  JoinRoomSchema,
  JoinRoom,
  KickUserSchema,
  KickUser,
} from '@chat-hub-99/shared-schema';
import { SchemaValidationPipe } from '../pipes/schema-validation.pipe';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('chat')
  @UsePipes(new SchemaValidationPipe(ChatMessageSchema))
  handleChatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ChatMessage
  ) {
    this.logger.log(`Validated chat payload from ${client.id}:`, payload);
    this.server.emit('chat', payload);
  }

  @SubscribeMessage('join_room')
  @UsePipes(new SchemaValidationPipe(JoinRoomSchema))
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinRoom
  ) {
    this.logger.log(`User ${payload.user.userName} joined ${payload.roomName}`);
    client.join(payload.roomName);
    this.server.to(payload.roomName).emit('join_room', payload);
  }

  @SubscribeMessage('kick_user')
  @UsePipes(new SchemaValidationPipe(KickUserSchema))
  handleKickUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: KickUser
  ) {
    this.logger.log(
      `User ${payload.userToKick.userName} kicked from ${payload.roomName}`
    );
    this.server.to(payload.roomName).emit('kick_user', payload);
  }
}
