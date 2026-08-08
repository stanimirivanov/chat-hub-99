import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
} from '@angular/core';
import { ArchivedWorkspaceListStore } from './archived-workspace-list.store';

/** Read-only archived-workspace history, intentionally without restoration. */
@Component({
  selector: 'app-archived-workspace-list',
  standalone: true,
  imports: [DatePipe],
  providers: [ArchivedWorkspaceListStore],
  templateUrl: './archived-workspace-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArchivedWorkspaceListComponent {
  /** Incremented after a local archive command changes the projection. */
  readonly refreshVersion = input(0);
  protected readonly store = inject(ArchivedWorkspaceListStore);

  constructor() {
    effect(() => {
      const refreshVersion = this.refreshVersion();
      void this.store.load(refreshVersion > 0);
    });
  }
}
