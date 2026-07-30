import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { AuthenticationStore } from '../store/authentication.store';
import { SignInComponent } from './sign-in.component';

describe('SignInComponent', () => {
  const configureComponent = async () => {
    const store = {
      isSigningIn: signal(false),
      error: signal(null),
      signIn: vi.fn().mockResolvedValue(true),
      clearError: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [SignInComponent],
      providers: [
        {
          provide: AuthenticationStore,
          useValue: store,
        },
      ],
    }).compileComponents();

    const fixture: ComponentFixture<SignInComponent> =
      TestBed.createComponent(SignInComponent);

    fixture.detectChanges();

    return {
      fixture,
      store,
    };
  };

  it('submits email and password to the store', async () => {
    const { fixture, store } = await configureComponent();

    const emailInput = fixture.nativeElement.querySelector(
      '#sign-in-email'
    ) as HTMLInputElement;

    const passwordInput = fixture.nativeElement.querySelector(
      '#sign-in-password'
    ) as HTMLInputElement;

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;

    emailInput.value = 'owner@chat-hub.local';

    passwordInput.value = 'Password123!';

    form.dispatchEvent(new Event('submit'));

    await fixture.whenStable();

    expect(store.signIn).toHaveBeenCalledExactlyOnceWith(
      'owner@chat-hub.local',
      'Password123!'
    );
  });
});
