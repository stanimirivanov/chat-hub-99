import { Injectable } from '@nestjs/common';
import { RoomNameSchema } from '@chat-hub-99/shared-schema';

@Injectable()
export class AppService {
  getData(): { message: string } {
    console.log('Shared Schema Loaded:', RoomNameSchema);
    return { message: 'Hello API' };
  }
}
