import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ChannelMessagesStore } from './channel-messages.store';

@Component({
  selector: 'app-channel-messages',
  standalone: true,
  templateUrl: './channel-messages.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ChannelMessagesStore],
})
export class ChannelMessagesComponent {
  protected readonly store = inject(ChannelMessagesStore);
}
