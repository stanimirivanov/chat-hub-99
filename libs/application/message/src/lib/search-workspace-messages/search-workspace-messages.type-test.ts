import type { Effect } from 'effect';
import { searchWorkspaceMessages } from './search-workspace-messages';
import type { SearchWorkspaceMessagesError } from './search-workspace-messages-error';
import type {
  MessageRepository,
  WorkspaceMessageSearchResult,
} from '../repository';

declare const input: Parameters<typeof searchWorkspaceMessages>[0];

const program: Effect.Effect<
  readonly WorkspaceMessageSearchResult[],
  SearchWorkspaceMessagesError,
  MessageRepository
> = searchWorkspaceMessages(input);

void program;
