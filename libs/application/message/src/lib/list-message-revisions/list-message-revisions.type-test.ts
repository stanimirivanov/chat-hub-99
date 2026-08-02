import type { Effect } from 'effect';
import type { MessageRevisionPage } from '../pagination';
import type { MessageRepository } from '../repository';
import type { ListMessageRevisionsError } from './list-message-revisions-error';
import { listMessageRevisions } from './list-message-revisions';

declare const input: Parameters<typeof listMessageRevisions>[0];

const program: Effect.Effect<
  MessageRevisionPage,
  ListMessageRevisionsError,
  MessageRepository
> = listMessageRevisions(input);

void program;
