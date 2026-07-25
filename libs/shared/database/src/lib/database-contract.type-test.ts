import type {
  CreateChannelArgs,
  CreateMessageArgs,
  CreateMessageResult,
  CurrentChannel,
  CurrentMessage,
  Database,
} from '../index';

const createChannelArgs: CreateChannelArgs = {
  p_workspace_id: '00000000-0000-0000-0000-000000000000',
  p_name: 'General',
  p_slug: 'general',
};

const createMessageArgs: CreateMessageArgs = {
  p_channel_id: '00000000-0000-0000-0000-000000000000',
  p_content: 'Hello',
};

const messageId: CreateMessageResult = '00000000-0000-0000-0000-000000000000';

declare const channel: CurrentChannel;
declare const message: CurrentMessage;
declare const database: Database;

void createChannelArgs;
void createMessageArgs;
void messageId;
void channel;
void message;
void database;
