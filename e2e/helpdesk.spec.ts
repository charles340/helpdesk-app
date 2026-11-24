import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test('a requester files a ticket and replies to it', async ({ page }) => {
  await signIn(page, 'luka@example.com');
  await expect(page.getByRole('heading', { name: 'My tickets' })).toBeVisible();

  await page.getByRole('link', { name: 'New ticket' }).first().click();
  await page.getByLabel('Title').fill('Docking station flickers');
  await page.getByLabel('Category').selectOption('hardware');
  await page
    .getByLabel('What happened?')
    .fill('The external monitor flickers every few seconds.');
  await page.getByRole('button', { name: 'Submit ticket' }).click();

  await expect(
    page.getByRole('heading', { name: 'Docking station flickers' }),
  ).toBeVisible();
  await expect(page.getByText('New', { exact: true }).first()).toBeVisible();

  await page
    .getByPlaceholder('Write a reply…')
    .fill('It also happens on battery.');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByText('It also happens on battery.')).toBeVisible();
});

test('requesters are kept out of staff pages', async ({ page }) => {
  await signIn(page, 'petra@example.com');
  // The nav streams in after the page, so wait for it before checking what's missing.
  await expect(
    page.getByRole('link', { name: 'Knowledge base' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Dashboard' })).toHaveCount(0);

  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/tickets$/);
  await page.goto('/admin/users');
  await expect(page).toHaveURL(/\/tickets$/);
  // Drafts look like missing articles.
  await page.goto('/kb/new-laptop-checklist');
  await expect(page.getByText(/could not be found|404/i).first()).toBeVisible();
});

test('an agent sees the dashboard and publishes an article', async ({
  page,
}) => {
  await signIn(page, 'ana@example.com');

  await page.getByRole('link', { name: 'Dashboard' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByText('Active tickets', { exact: true })).toBeVisible();
  await expect(
    page
      .getByRole('list', { name: 'Tickets opened per day' })
      .getByRole('listitem'),
  ).toHaveCount(14);

  // Unique per run, so the test also passes against a reused server.
  const run = Date.now().toString(36);
  await page.goto('/kb/new');
  await page.getByLabel('Title').fill(`Teams camera is black ${run}`);
  await page
    .getByRole('textbox', { name: 'Article' })
    .fill('## Fix\n\n1. Close the Camera app.\n2. Restart Teams.');
  await page.getByRole('tab', { name: 'Preview' }).click();
  await expect(page.getByRole('heading', { name: 'Fix' })).toBeVisible();
  await page.getByRole('button', { name: 'Create article' }).click();

  await expect(page).toHaveURL(new RegExp(`/kb/teams-camera-is-black-${run}$`));
  await expect(page.getByText('Restart Teams.')).toBeVisible();
});

test('an admin changes a role', async ({ page }) => {
  await signIn(page, 'admin@example.com');
  await page.getByRole('link', { name: 'Users' }).click();

  const role = page.getByLabel('Role for Tomislav Jurić');
  const next = (await role.inputValue()) === 'agent' ? 'user' : 'agent';
  await role.selectOption(next);
  await page.waitForLoadState('networkidle');

  await page.reload();
  await expect(page.getByLabel('Role for Tomislav Jurić')).toHaveValue(next);
  // Admins can't change their own role.
  await expect(page.getByLabel('Role for Admin')).toHaveCount(0);
});
