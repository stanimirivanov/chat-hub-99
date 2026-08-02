import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthenticationStore } from '../store/authentication.store';

/**
 * Email/password account-registration form.
 *
 * The component owns DOM interaction only. Validation, provider execution,
 * command serialization, retained confirmation address, and resend state
 * remain in the authentication application boundary and root store.
 */
@Component({
  selector: 'app-sign-up',
  standalone: true,
  templateUrl: './sign-up.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignUpComponent {
  protected readonly store = inject(AuthenticationStore);

  protected async submit(
    emailInput: HTMLInputElement,
    passwordInput: HTMLInputElement
  ): Promise<void> {
    await this.store.signUp(emailInput.value, passwordInput.value);
  }
}
