export {
  authorId,
  channelId,
  messageId,
  messageContent,
  activeMessage,
  deletedMessage,
} from './message-application-fixtures';

export {
  makeMessageRepositoryStub,
  makeMessageRepositoryLayer,
  makeListByChannelRepository,
  makeListRevisionsRepository,
  makeObserveByChannelRepository,
} from './message-repository.stub';
