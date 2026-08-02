import { computed } from '@angular/core';
import { signalStoreFeature, type, withComputed } from '@ngrx/signals';
import type { ChannelMessagesState } from '../channel-messages.state';

/**
 * Adds presentation-oriented values derived from channel-message state.
 */
export const withChannelMessagesComputed = () =>
  signalStoreFeature(
    {
      state: type<ChannelMessagesState>(),
    },

    withComputed((store) => ({
      isLoading: computed(() => store.loadStatus() === 'loading'),

      isLoadingOlder: computed(() => store.olderMessagesStatus() === 'loading'),

      hasMessages: computed(() => store.messages().length > 0),

      isSending: computed(() => store.sendMessageStatus() === 'sending'),

      isEditing: computed(() => store.editMessageStatus() === 'editing'),

      isDeleting: computed(() => store.deleteMessageStatus() === 'deleting'),

      isLoadingMessageRevisions: computed(
        () => store.messageRevisionsStatus() === 'loading'
      ),

      isLoadingOlderMessageRevisions: computed(
        () => store.olderMessageRevisionsStatus() === 'loading'
      ),

      canLoadOlderMessageRevisions: computed(
        () =>
          store.messageRevisionsStatus() === 'loaded' &&
          store.revisionNextCursor() !== null &&
          store.olderMessageRevisionsStatus() !== 'loading'
      ),

      canLoadOlder: computed(
        () =>
          store.loadStatus() === 'loaded' &&
          store.nextCursor() !== null &&
          store.olderMessagesStatus() !== 'loading'
      ),
    }))
  );
