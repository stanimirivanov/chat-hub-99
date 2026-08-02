import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { AuthenticationStore } from '../store/authentication.store';
import { SignUpComponent } from './sign-up.component';

describe('SignUpComponent', () => {
  const configureComponent = async (confirmationRequired = false) => {
    const store = {
      isSigningUp: signal(false),
      requiresEmailConfirmation: signal(confirmationRequired),
      error: signal(null),
      signUp: vi.fn().mockResolvedValue(true),
      clearError: vi.fn(),
      resetSignUp: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [SignUpComponent],
      providers: [
        {
          provide: AuthenticationStore,
          useValue: store,
        },
      ],
    }).compileComponents();

    const fixture: ComponentFixture<SignUpComponent> =
      TestBed.createComponent(SignUpComponent);
    fixture.detectChanges();

    return { fixture, store };
  };

  it('submits email and password to the store', async () => {
    const { fixture, store } = await configureComponent();
    const emailInput = fixture.nativeElement.querySelector(
      '#sign-up-email'
    ) as HTMLInputElement;
    const passwordInput = fixture.nativeElement.querySelector(
      '#sign-up-password'
    ) as HTMLInputElement;
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;

    emailInput.value = 'new-user@example.com';
    passwordInput.value = 'Password123!';
    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(store.signUp).toHaveBeenCalledExactlyOnceWith(
      'new-user@example.com',
      'Password123!'
    );
  });

  it('renders the confirmation completion without the form', async () => {
    const { fixture, store } = await configureComponent(true);

    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Check your email');

    const resetButton = fixture.nativeElement.querySelector(
      'button'
    ) as HTMLButtonElement;
    resetButton.click();

    expect(store.resetSignUp).toHaveBeenCalledOnce();
  });
});
