import { expect, test } from '@playwright/test';

const seededOwner = {
  email: 'owner@omoikane.local',
  password: 'Password123!',
} as const;

test('a seeded member can collaborate through the browser and sign out', async ({
  page,
}) => {
  const message = `Browser smoke ${Date.now()}`;

  await page.goto('/');

  const signIn = page.getByRole('region', { name: 'Sign in to Omoikane' });
  await expect(signIn).toBeVisible();
  await signIn.getByLabel('Email').fill(seededOwner.email);
  await signIn.getByLabel('Password').fill(seededOwner.password);
  await signIn.getByRole('button', { name: 'Sign in', exact: true }).click();

  await expect(
    page.getByRole('heading', { name: 'Workspaces', exact: true })
  ).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Accessible workspaces' })
    .getByRole('button', { name: 'Omoikane Development', exact: true })
    .click();

  await expect(
    page.getByRole('heading', { name: 'Omoikane Development', exact: true })
  ).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Workspace channels' })
    .getByRole('button', { name: /^General/u })
    .click();

  const composer = page.getByRole('textbox', { name: 'Message', exact: true });
  await expect(composer).toBeVisible();
  await composer.fill(message);
  await page.getByRole('button', { name: 'Send', exact: true }).click();

  await expect(
    page.getByRole('listitem').filter({ hasText: message })
  ).toBeVisible();

  await page.getByRole('button', { name: 'Sign out', exact: true }).click();

  await expect(
    page.getByRole('heading', { name: 'Sign in to Omoikane', exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Sign out', exact: true })
  ).toHaveCount(0);
});
