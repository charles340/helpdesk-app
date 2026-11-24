import { expect, type Page } from '@playwright/test';

/** Every seeded account uses this password. See scripts/seed.ts. */
export const DEMO_PASSWORD = 'deskline-demo';

export async function signIn(page: Page, email: string) {
  await page.goto('/sign-in');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/tickets$/);
}
