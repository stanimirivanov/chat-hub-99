import { signalStore, withState } from '@ngrx/signals';
import { initialChannelMessagesState } from './channel-messages.state';
import { withChannelMessageMutations } from './store/with-channel-message-mutations';
import { withChannelMessagesComputed } from './store/with-channel-messages-computed';
import { withChannelMessagesLoading } from './store/with-channel-messages-loading';
import { withChannelMessageAuthors } from './store/with-channel-message-authors';
import { withChannelMessageRealtime } from './store/with-channel-message-realtime';
import { withChannelMessageRevisions } from './store/with-channel-message-revisions';

/**
 * Owns message-list state for the currently selected channel.
 *
 * The store is composed from local features grouped by responsibility:
 *
 * - derived presentation state;
 * - author-profile enrichment;
 * - realtime subscription lifecycle;
 * - channel selection and page loading;
 * - message mutations.
 *
 * It remains one feature-scoped store instance and one public state model.
 */
export const ChannelMessagesStore = signalStore(
  withState(initialChannelMessagesState),

  withChannelMessagesComputed(),

  withChannelMessageAuthors(),

  withChannelMessageRealtime(),

  withChannelMessagesLoading(),

  withChannelMessageRevisions(),

  withChannelMessageMutations()
);
