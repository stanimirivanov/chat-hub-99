import type { ChannelId } from '@chat-hub/domain/channel';
import type { ProfileId } from '@chat-hub/domain/profile';
import type { MessageContent, MessageId, MessageRevisionId } from '../index';

type Equal<Left, Right> =
  (<Type>() => Type extends Left ? 1 : 2) extends <Type>() => Type extends Right
    ? 1
    : 2
    ? true
    : false;

type Expect<Value extends true> = Value;

type MessageIdIsNotChannelId = Expect<
  Equal<MessageId extends ChannelId ? true : false, false>
>;

type ChannelIdIsNotMessageId = Expect<
  Equal<ChannelId extends MessageId ? true : false, false>
>;

type MessageIdIsNotProfileId = Expect<
  Equal<MessageId extends ProfileId ? true : false, false>
>;

type ProfileIdIsNotMessageId = Expect<
  Equal<ProfileId extends MessageId ? true : false, false>
>;

type RevisionIdIsNotMessageId = Expect<
  Equal<MessageRevisionId extends MessageId ? true : false, false>
>;

type MessageIdIsNotRevisionId = Expect<
  Equal<MessageId extends MessageRevisionId ? true : false, false>
>;

type MessageContentIsNotStringAssignableFromUnknown = Expect<
  Equal<unknown extends MessageContent ? true : false, false>
>;

void (0 as unknown as MessageIdIsNotChannelId);
void (0 as unknown as ChannelIdIsNotMessageId);
void (0 as unknown as MessageIdIsNotProfileId);
void (0 as unknown as ProfileIdIsNotMessageId);
void (0 as unknown as RevisionIdIsNotMessageId);
void (0 as unknown as MessageIdIsNotRevisionId);
void (0 as unknown as MessageContentIsNotStringAssignableFromUnknown);
