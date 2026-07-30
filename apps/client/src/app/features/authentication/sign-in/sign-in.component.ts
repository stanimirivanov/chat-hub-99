import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthenticationStore } from '../store/authentication.store';

/**
 * Email/password sign-in form.
 *
 * Authentication behavior and state remain in `AuthenticationStore`; the
 * component owns only DOM interaction.
 */
@Component({
  selector: 'app-sign-in',
  standalone: true,
  templateUrl: './sign-in.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignInComponent {
  protected readonly store = inject(AuthenticationStore);

  protected async submit(
    emailInput: HTMLInputElement,
    passwordInput: HTMLInputElement
  ): Promise<void> {
    await this.store.signIn(emailInput.value, passwordInput.value);
  }
}
