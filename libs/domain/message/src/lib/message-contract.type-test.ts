import type { ChannelId, MessageContent, MessageId } from '../index';

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

type MessageContentIsNotStringAssignableFromUnknown = Expect<
  Equal<unknown extends MessageContent ? true : false, false>
>;

void (0 as unknown as MessageIdIsNotChannelId);
void (0 as unknown as ChannelIdIsNotMessageId);
void (0 as unknown as MessageContentIsNotStringAssignableFromUnknown);
