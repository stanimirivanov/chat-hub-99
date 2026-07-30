import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ChannelNavigationComponent } from '@client/features/channel-navigation/channel-navigation.component';
import { WorkspaceNavigationStore } from './workspace-navigation.store';

/**
 * Lists accessible workspaces and owns one feature-scoped selection store.
 */
@Component({
  selector: 'app-workspace-navigation',
  standalone: true,
  imports: [ChannelNavigationComponent],
  providers: [WorkspaceNavigationStore],
  templateUrl: './workspace-navigation.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceNavigationComponent {
  protected readonly store = inject(WorkspaceNavigationStore);

  constructor() {
    void this.store.load();
  }
}
