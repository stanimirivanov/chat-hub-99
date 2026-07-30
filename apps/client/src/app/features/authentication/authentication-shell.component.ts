import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SignInComponent } from './sign-in/sign-in.component';
import { AuthenticationStore } from './store/authentication.store';
import { WorkspaceNavigationComponent } from '../workspace-navigation/workspace-navigation.component';

/**
 * Application entry shell selected by authentication state.
 *
 * The shell triggers explicit one-time store initialization and renders either
 * the sign-in feature or authenticated application content.
 */
@Component({
  selector: 'app-authentication-shell',
  standalone: true,
  imports: [SignInComponent, WorkspaceNavigationComponent],
  templateUrl: './authentication-shell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthenticationShellComponent {
  protected readonly store = inject(AuthenticationStore);

  constructor() {
    /*
     * Initialization is an explicit lifecycle action, not a reaction to a
     * signal dependency. Therefore an Angular effect() is unnecessary.
     */
    void this.store.initialize();
  }
}
