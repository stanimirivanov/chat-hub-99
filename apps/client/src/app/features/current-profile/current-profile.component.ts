import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
} from '@angular/core';
import { CurrentProfileStore } from './current-profile.store';

/**
 * Displays the current user's profile while retaining session email fallback.
 */
@Component({
  selector: 'app-current-profile',
  standalone: true,
  providers: [CurrentProfileStore],
  templateUrl: './current-profile.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CurrentProfileComponent {
  readonly userId = input.required<string>();
  readonly fallbackEmail = input.required<string>();
  protected readonly store = inject(CurrentProfileStore);

  constructor() {
    effect(() => {
      void this.store.load(this.userId());
    });
  }
}
