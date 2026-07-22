import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { ChatMessage, JoinRoom, KickUser } from '@chat-hub-99/shared-schema';

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private socket: Socket;

  constructor() {
    this.socket = io('http://localhost:3000');
  }

  // Listens to incoming chat events
  onChatMessage(): Observable<ChatMessage> {
    return new Observable((subscriber) => {
      this.socket.on('chat', (data: ChatMessage) => {
        subscriber.next(data);
      });
    });
  }

  // Sends chat messages to the NestJS Gateway
  sendChatMessage(payload: ChatMessage): void {
    this.socket.emit('chat', payload);
  }

  // Join a chat room
  joinRoom(payload: JoinRoom): void {
    this.socket.emit('join_room', payload);
  }

  // Kick user from room
  kickUser(payload: KickUser): void {
    this.socket.emit('kick_user', payload);
  }
}
