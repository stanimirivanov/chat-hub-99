import { signalStore, withState } from '@ngrx/signals';
import { initialChannelMessagesState } from './channel-messages.state';
import { withChannelMessageMutations } from './store/with-channel-message-mutations';
import { withChannelMessagesComputed } from './store/with-channel-messages-computed';
import { withChannelMessagesLoading } from './store/with-channel-messages-loading';

/**
 * Owns message-list state for the currently selected channel.
 *
 * The store is composed from local features grouped by responsibility:
 *
 * - derived presentation state;
 * - channel selection and page loading;
 * - message mutations.
 *
 * It remains one feature-scoped store instance and one public state model.
 */
export const ChannelMessagesStore = signalStore(
  withState(initialChannelMessagesState),

  withChannelMessagesComputed(),

  withChannelMessagesLoading(),

  withChannelMessageMutations()
);
