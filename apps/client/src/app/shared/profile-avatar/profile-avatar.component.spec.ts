import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import { AvatarUrlSchema, type AvatarUrl } from '@omoikane/domain/profile';
import { ProfileAvatarComponent } from './profile-avatar.component';

const avatarUrl = Schema.decodeUnknownSync(AvatarUrlSchema)(
  'https://example.com/avatar.png'
);

const render = async (
  displayName: string,
  url: AvatarUrl | null = null
): Promise<ComponentFixture<ProfileAvatarComponent>> => {
  await TestBed.configureTestingModule({
    imports: [ProfileAvatarComponent],
  }).compileComponents();

  const fixture = TestBed.createComponent(ProfileAvatarComponent);
  fixture.componentRef.setInput('displayName', displayName);
  fixture.componentRef.setInput('avatarUrl', url);
  fixture.detectChanges();
  return fixture;
};

describe('ProfileAvatarComponent', () => {
  it('renders a validated avatar as a decorative external image', async () => {
    const fixture = await render('Workspace Owner', avatarUrl);
    const image = fixture.nativeElement.querySelector(
      'img'
    ) as HTMLImageElement;

    expect(image.src).toBe(avatarUrl);
    expect(image.alt).toBe('');
    expect(image.getAttribute('referrerpolicy')).toBe('no-referrer');
  });

  it('renders initials when no avatar exists', async () => {
    const fixture = await render('Workspace Owner');
    const fallback = fixture.nativeElement.querySelector('span') as HTMLElement;

    expect(fallback.textContent?.trim()).toBe('WO');
    expect(fallback.getAttribute('aria-hidden')).toBe('true');
  });

  it('falls back after the external image fails', async () => {
    const fixture = await render('Workspace Owner', avatarUrl);
    const image = fixture.nativeElement.querySelector(
      'img'
    ) as HTMLImageElement;

    image.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    expect(fixture.nativeElement.textContent.trim()).toBe('WO');
  });
});
