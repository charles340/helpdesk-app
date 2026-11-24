import { describe, expect, it } from 'vitest';
import { addUser, setupTestDb } from '@/test/db';
import { deleteArticle, getArticle, listArticles, saveArticle } from './kb';

const t = setupTestDb();

const draft = {
  title: 'Connecting to the VPN',
  body: 'Open the VPN client and sign in.',
  published: false,
};

describe('drafts', () => {
  it('are visible to staff only', async () => {
    const agent = await addUser(t.db, 'agent');
    const requester = await addUser(t.db, 'user');
    const article = await saveArticle(t.db, agent, null, draft);

    expect(await getArticle(t.db, requester, article.slug)).toBeNull();
    expect(await getArticle(t.db, agent, article.slug)).not.toBeNull();
    expect(await listArticles(t.db, requester)).toHaveLength(0);
    expect(await listArticles(t.db, agent)).toHaveLength(1);

    await saveArticle(t.db, agent, article.id, {
      ...draft,
      slug: article.slug,
      published: true,
    });
    expect(
      await listArticles(t.db, requester, { q: 'vpn client' }),
    ).toHaveLength(1);
  });
});

describe('slugs', () => {
  it('come from the title and get a number when taken', async () => {
    const agent = await addUser(t.db, 'agent');
    const first = await saveArticle(t.db, agent, null, draft);
    const second = await saveArticle(t.db, agent, null, draft);
    expect(first.slug).toBe('connecting-to-the-vpn');
    expect(second.slug).toBe('connecting-to-the-vpn-2');
  });

  it('report a typed slug that is already used, on the slug field', async () => {
    const agent = await addUser(t.db, 'agent');
    await saveArticle(t.db, agent, null, { ...draft, slug: 'vpn' });
    await expect(
      saveArticle(t.db, agent, null, { ...draft, slug: 'VPN' }),
    ).rejects.toMatchObject({ code: 'invalid', field: 'slug' });
  });

  it('let an article keep its own slug when edited', async () => {
    const agent = await addUser(t.db, 'agent');
    const article = await saveArticle(t.db, agent, null, {
      ...draft,
      slug: 'vpn',
    });
    const edited = await saveArticle(t.db, agent, article.id, {
      ...draft,
      title: 'VPN setup',
      slug: 'vpn',
    });
    expect(edited.slug).toBe('vpn');
    expect(edited.title).toBe('VPN setup');
  });

  it('never use addresses taken by pages', async () => {
    const agent = await addUser(t.db, 'agent');
    await expect(
      saveArticle(t.db, agent, null, { ...draft, slug: 'new' }),
    ).rejects.toMatchObject({ field: 'slug' });
    const fromTitle = await saveArticle(t.db, agent, null, {
      ...draft,
      title: 'New',
    });
    expect(fromTitle.slug).toBe('new-2');
  });

  it('need at least one letter or number', async () => {
    const agent = await addUser(t.db, 'agent');
    await expect(
      saveArticle(t.db, agent, null, { ...draft, title: '???' }),
    ).rejects.toMatchObject({ field: 'title' });
  });
});

describe('permissions', () => {
  it('keep requesters from writing or deleting', async () => {
    const agent = await addUser(t.db, 'agent');
    const requester = await addUser(t.db, 'user');
    const article = await saveArticle(t.db, agent, null, draft);

    await expect(
      saveArticle(t.db, requester, null, draft),
    ).rejects.toMatchObject({
      code: 'forbidden',
    });
    await expect(
      deleteArticle(t.db, requester, article.id),
    ).rejects.toMatchObject({
      code: 'forbidden',
    });
  });

  it('delete for staff and report a missing article', async () => {
    const agent = await addUser(t.db, 'agent');
    const article = await saveArticle(t.db, agent, null, draft);
    await deleteArticle(t.db, agent, article.id);
    await expect(deleteArticle(t.db, agent, article.id)).rejects.toMatchObject({
      code: 'not_found',
    });
  });
});
