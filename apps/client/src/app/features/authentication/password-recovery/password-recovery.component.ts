import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthenticationStore } from '../store/authentication.store';

/**
 * Owns password-recovery form interaction for both email request and update.
 *
 * The root authentication store remains the consistency boundary because the
 * two forms coordinate with the same provider session stream. This component
 * does not inspect callback tokens or provider events.
 */
@Component({
  selector: 'app-password-recovery',
  standalone: true,
  templateUrl: './password-recovery.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordRecoveryComponent {
  protected readonly store = inject(AuthenticationStore);

  protected async requestReset(emailInput: HTMLInputElement): Promise<void> {
    await this.store.requestPasswordReset(emailInput.value);
  }

  protected async updatePassword(
    passwordInput: HTMLInputElement,
    passwordConfirmationInput: HTMLInputElement
  ): Promise<void> {
    await this.store.updatePassword(
      passwordInput.value,
      passwordConfirmationInput.value
    );
  }
}
