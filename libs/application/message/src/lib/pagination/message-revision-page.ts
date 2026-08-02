import type { MessageRevision } from '@chat-hub/domain/message';
import type { MessageRevisionCursor } from './message-revision-cursor';

/** One newest-first page of immutable revisions for a stable message. */
export interface MessageRevisionPage {
  readonly revisions: readonly MessageRevision[];
  readonly nextCursor: MessageRevisionCursor | null;
}
