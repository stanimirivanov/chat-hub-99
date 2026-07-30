import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { WorkspaceNavigationStore } from './workspace-navigation.store';

/**
 * Lists accessible workspaces and owns one feature-scoped selection store.
 */
@Component({
  selector: 'app-workspace-navigation',
  standalone: true,
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
