# CC Personal Website V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Supabase-backed GitHub/email authentication, article likes, article comments with one-level replies, a login-only guestbook, and five imported Obsidian articles to the existing Astro Theme Pure website.

**Architecture:** Keep Astro pages and Markdown content on Vercel while browser-side interaction modules use the Supabase publishable key under PostgreSQL RLS. Store the complete schema, policies, triggers, and RPC functions as versioned SQL migrations so the managed Tokyo database can later be restored to self-hosted Supabase on Oracle Cloud.

**Tech Stack:** Astro 6.2.1, TypeScript 6, Bun test runner, `@supabase/supabase-js` 2.x, Supabase PostgreSQL/Auth, pgTAP, Playwright, Vercel.

## Global Constraints

- Preserve the current Astro Theme Pure visual language and light/dark/system theme behavior.
- Use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; never expose `SUPABASE_SECRET_KEY`, database passwords, or PostgreSQL URLs to browser bundles.
- GitHub OAuth and verified email/password are the only login methods.
- Reading is public; writing comments, replies, guestbook messages, and likes requires login.
- Comments are 1–1000 trimmed characters, have one reply level, and enforce a 30-second per-user posting cooldown.
- Users may soft-delete their own comments; users in `site_admins` may soft-delete any comment.
- No CMS, profile editor, anonymous comments, moderation queue, or production Oracle dependency.
- Supabase is in Tokyo `ap-northeast-1`; Vercel Functions use Tokyo `hnd1`.
- Article source wording is preserved; conversion is limited to frontmatter, heading hierarchy, code/callout compatibility, whitespace, and responsive tables.

---

## File Structure

```text
src/lib/supabase/config.ts              public configuration resolution
src/lib/supabase/client.ts              lazy browser client singleton
src/lib/supabase/database.types.ts      generated/manual database interfaces
src/lib/supabase/auth.ts                session and authentication operations
src/lib/supabase/comments.ts            comment queries and tree assembly
src/lib/supabase/likes.ts               article-like queries and state transitions
src/components/auth/AuthStatus.astro    header identity control
src/components/auth/AuthForms.astro     GitHub/email authentication UI
src/components/comments/CommentThread.astro generic post/guestbook thread
src/components/likes/LikeButton.astro   article like control
src/components/layout/Header.astro      local theme-compatible header extension
src/pages/login.astro                   authentication page
src/pages/auth/callback.astro           OAuth/email callback page
src/pages/guestbook.astro               public-read, login-write guestbook
src/content/blog/*.md                   five imported articles
src/utils/obsidian-import.ts            pure Obsidian Markdown conversion
scripts/import-obsidian-posts.ts        deterministic source-to-content importer
supabase/migrations/*.sql               schema, triggers, functions, policies
supabase/tests/*.sql                    pgTAP authorization and integrity tests
tests/*.test.ts                         Bun unit/structure/content tests
tests/e2e/v2.spec.ts                    browser acceptance flows
vercel.json                             Tokyo function region
```

---

### Task 1: Supabase Browser Configuration and Typed Client

**Files:**
- Modify: `package.json`
- Modify: `astro.config.ts`
- Create: `src/env.d.ts`
- Create: `src/lib/supabase/config.ts`
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/database.types.ts`
- Create: `tests/supabase-config.test.ts`

**Interfaces:**
- Produces: `resolveSupabaseConfig(env)`, `supabaseConfig`, `getSupabaseClient()`, and the `Database` type consumed by all later interaction modules.
- Consumes: Vercel Marketplace variables `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

- [ ] **Step 1: Add a failing configuration test**

```ts
import { describe, expect, test } from 'bun:test'
import { resolveSupabaseConfig } from '../src/lib/supabase/config'

describe('resolveSupabaseConfig', () => {
  test('enables Supabase only when both public values exist', () => {
    expect(resolveSupabaseConfig({})).toEqual({ enabled: false, key: '', url: '' })
    expect(resolveSupabaseConfig({ NEXT_PUBLIC_SUPABASE_URL: 'https://demo.supabase.co' })).toEqual({
      enabled: false,
      key: '',
      url: 'https://demo.supabase.co'
    })
    expect(resolveSupabaseConfig({
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_demo',
      NEXT_PUBLIC_SUPABASE_URL: 'https://demo.supabase.co'
    })).toEqual({ enabled: true, key: 'sb_publishable_demo', url: 'https://demo.supabase.co' })
  })
})
```

- [ ] **Step 2: Run the test and confirm the RED state**

Run: `bun test tests/supabase-config.test.ts`  
Expected: FAIL because `src/lib/supabase/config.ts` does not exist.

- [ ] **Step 3: Install Supabase JS and implement public configuration**

Run: `bun add @supabase/supabase-js@^2`

```ts
// src/lib/supabase/config.ts
export type PublicSupabaseEnv = Record<string, string | undefined>

export function resolveSupabaseConfig(env: PublicSupabaseEnv) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ''
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? ''
  return { enabled: Boolean(url && key), key, url }
}

export const supabaseConfig = resolveSupabaseConfig(import.meta.env)
```

Add `vite: { envPrefix: ['PUBLIC_', 'NEXT_PUBLIC_'] }` to `defineConfig()` in `astro.config.ts`. Declare only the two allowed variables in `src/env.d.ts`:

```ts
interface ImportMetaEnv {
  readonly NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string
  readonly NEXT_PUBLIC_SUPABASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

- [ ] **Step 4: Add the minimal database type and lazy client**

```ts
// src/lib/supabase/database.types.ts
export type CommentTarget = 'guestbook' | 'post'

export interface ProfileRow {
  avatar_url: string | null
  created_at: string
  display_name: string
  id: string
  updated_at: string
}

export interface CommentRow {
  author_id: string
  body: string | null
  created_at: string
  deleted_at: string | null
  id: string
  parent_id: string | null
  target_key: string
  target_type: CommentTarget
}

export interface PostLikeRow {
  created_at: string
  post_slug: string
  user_id: string
}

export type Database = {
  public: {
    Functions: {
      delete_comment: { Args: { comment_id: string }; Returns: boolean }
      is_site_admin: { Args: Record<string, never>; Returns: boolean }
    }
    Tables: {
      comments: { Row: CommentRow; Insert: Omit<CommentRow, 'body' | 'created_at' | 'deleted_at' | 'id'> & { body: string }; Update: never }
      post_likes: { Row: PostLikeRow; Insert: Omit<PostLikeRow, 'created_at'>; Update: never }
      profiles: { Row: ProfileRow; Insert: Pick<ProfileRow, 'id' | 'display_name'> & Partial<ProfileRow>; Update: Partial<Pick<ProfileRow, 'avatar_url' | 'display_name' | 'updated_at'>> }
      site_admins: { Row: { created_at: string; user_id: string }; Insert: never; Update: never }
    }
    Views: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
```

```ts
// src/lib/supabase/client.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { supabaseConfig } from './config'
import type { Database } from './database.types'

let client: SupabaseClient<Database> | null = null

export function getSupabaseClient() {
  if (!supabaseConfig.enabled) return null
  client ??= createClient<Database>(supabaseConfig.url, supabaseConfig.key, {
    auth: { detectSessionInUrl: true, persistSession: true }
  })
  return client
}
```

- [ ] **Step 5: Verify GREEN and commit**

Run: `bun test tests/supabase-config.test.ts && bun run check`  
Expected: PASS and zero Astro diagnostics.

```bash
git add package.json bun.lock astro.config.ts src/env.d.ts src/lib/supabase tests/supabase-config.test.ts
git commit -m "feat: add typed Supabase browser client"
```

---

### Task 2: PostgreSQL Schema, Integrity Rules, RPC, and RLS

**Files:**
- Create: `supabase/config.toml`
- Create: `supabase/migrations/202607160001_website_v2.sql`
- Create: `supabase/tests/website_v2.test.sql`
- Create: `tests/database-migration.test.ts`

**Interfaces:**
- Produces: `profiles`, `site_admins`, `comments`, `post_likes`, `is_site_admin()`, and `delete_comment(uuid)` matching `Database` from Task 1.
- Consumes: Supabase Auth schema and JWT `sub`/`email` claims.

- [ ] **Step 1: Write a failing migration contract test**

```ts
import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const sql = readFileSync('supabase/migrations/202607160001_website_v2.sql', 'utf8')

describe('website v2 migration', () => {
  for (const fragment of [
    'create table public.profiles',
    'create table public.site_admins',
    'create table public.comments',
    'create table public.post_likes',
    'create or replace function public.delete_comment',
    'enable row level security',
    "interval '30 seconds'"
  ]) test(`contains ${fragment}`, () => expect(sql.toLowerCase()).toContain(fragment))

  test('never grants clients access to site_admins writes', () => {
    expect(sql.toLowerCase()).not.toContain('for insert on public.site_admins')
  })
})
```

- [ ] **Step 2: Run the contract test and confirm RED**

Run: `bun test tests/database-migration.test.ts`  
Expected: FAIL because the migration file is absent.

- [ ] **Step 3: Implement the schema and core functions**

Create the migration with these exact database behaviors:

```sql
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 50),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.site_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('post', 'guestbook')),
  target_key text not null check (char_length(target_key) between 1 and 160),
  parent_id uuid references public.comments(id),
  author_id uuid not null references auth.users(id) on delete cascade,
  body text check (body is null or char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (target_type <> 'guestbook' or target_key = 'guestbook')
);

create index comments_target_created_idx
  on public.comments(target_type, target_key, created_at desc);
create index comments_parent_idx on public.comments(parent_id);

create table public.post_likes (
  post_slug text not null check (char_length(post_slug) between 1 and 160),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_slug, user_id)
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, display_name, avatar_url)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1), '新朋友'), 50),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  ) on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.validate_comment()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare parent_row public.comments%rowtype;
begin
  new.body := trim(new.body);
  if new.body is null or char_length(new.body) not between 1 and 1000 then
    raise exception '评论内容需要在 1–1000 字之间' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.comments
    where author_id = new.author_id and created_at > now() - interval '30 seconds'
  ) then
    raise exception '发布太快了，请在 30 秒后再试' using errcode = 'P0001';
  end if;
  if new.parent_id is not null then
    select * into parent_row from public.comments where id = new.parent_id;
    if not found or parent_row.parent_id is not null
      or parent_row.target_type <> new.target_type
      or parent_row.target_key <> new.target_key then
      raise exception '只能回复同一页面的顶级评论' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create trigger validate_comment_before_insert before insert on public.comments
for each row execute function public.validate_comment();

create or replace function public.is_site_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.site_admins where user_id = auth.uid());
$$;

create or replace function public.delete_comment(comment_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.comments
  set body = null, deleted_at = now()
  where id = comment_id
    and deleted_at is null
    and (author_id = auth.uid() or public.is_site_admin());
  return found;
end;
$$;
```

- [ ] **Step 4: Add RLS policies and grants**

Append policies that: publicly select profiles/comments/likes; let authenticated users insert/update only their own profile; insert comments only with `author_id = auth.uid()`; insert/delete likes only for `user_id = auth.uid()`; expose neither direct comment mutation nor `site_admins` mutation. Revoke all RPC execution first, then grant `is_site_admin()` and `delete_comment(uuid)` only to `authenticated`.

```sql
alter table public.profiles enable row level security;
alter table public.site_admins enable row level security;
alter table public.comments enable row level security;
alter table public.post_likes enable row level security;

create policy profiles_public_read on public.profiles for select using (true);
create policy profiles_insert_own on public.profiles for insert to authenticated with check (id = auth.uid());
create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy comments_public_read on public.comments for select using (true);
create policy comments_insert_own on public.comments for insert to authenticated with check (author_id = auth.uid());
create policy likes_public_read on public.post_likes for select using (true);
create policy likes_insert_own on public.post_likes for insert to authenticated with check (user_id = auth.uid());
create policy likes_delete_own on public.post_likes for delete to authenticated using (user_id = auth.uid());

revoke all on table public.site_admins from anon, authenticated;
grant select on table public.profiles, public.comments, public.post_likes to anon, authenticated;
grant insert, update on table public.profiles to authenticated;
grant insert on table public.comments to authenticated;
grant insert, delete on table public.post_likes to authenticated;

revoke all on function public.is_site_admin() from public, anon;
revoke all on function public.delete_comment(uuid) from public, anon;
grant execute on function public.is_site_admin() to authenticated;
grant execute on function public.delete_comment(uuid) to authenticated;
```

- [ ] **Step 5: Add pgTAP tests for uniqueness, reply depth, cooldown, and RLS**

Create a transaction-scoped pgTAP file that inserts three deterministic `auth.users`, assigns one to `site_admins`, changes `request.jwt.claims` for each user, and asserts:

```sql
begin;
select plan(14);
select has_table('public', 'comments', 'comments table exists');
select has_pk('public', 'post_likes', 'likes have a composite primary key');
select policies_are('public', 'comments', array['comments_insert_own', 'comments_public_read']);
select policies_are('public', 'post_likes', array['likes_delete_own', 'likes_insert_own', 'likes_public_read']);
select function_returns('public', 'delete_comment', array['uuid'], 'boolean');
select function_returns('public', 'is_site_admin', array[]::text[], 'boolean');
select col_is_null('public', 'comments', 'body', 'soft deletion allows a null body');
select col_not_null('public', 'comments', 'target_key', 'every thread has a target key');

insert into auth.users(id, email, aud, role, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'alice@example.com', 'authenticated', 'authenticated', '', now(), '{}', '{}'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'bob@example.com', 'authenticated', 'authenticated', '', now(), '{}', '{}'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'admin@example.com', 'authenticated', 'authenticated', '', now(), '{}', '{}');
insert into public.site_admins(user_id) values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true);
insert into public.post_likes(post_slug, user_id)
values ('test-post', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
select throws_ok(
  $$insert into public.post_likes(post_slug, user_id) values ('test-post', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$$,
  '23505', 'duplicate key value violates unique constraint "post_likes_pkey"',
  'a user can like a post only once'
);
insert into public.comments(id, target_type, target_key, author_id, body, created_at)
values ('11111111-1111-4111-8111-111111111111', 'post', 'test-post', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'root', now() - interval '2 minutes');

select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true);
insert into public.comments(id, target_type, target_key, parent_id, author_id, body, created_at)
values ('22222222-2222-4222-8222-222222222222', 'post', 'test-post', '11111111-1111-4111-8111-111111111111', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'reply', now() - interval '2 minutes');
select throws_ok(
  $$insert into public.comments(target_type, target_key, parent_id, author_id, body) values ('post', 'test-post', '22222222-2222-4222-8222-222222222222', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'nested')$$,
  '23514', '只能回复同一页面的顶级评论', 'second-level replies are rejected'
);
insert into public.comments(id, target_type, target_key, author_id, body, created_at)
values ('33333333-3333-4333-8333-333333333333', 'guestbook', 'guestbook', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'first recent message', now());
select throws_ok(
  $$insert into public.comments(target_type, target_key, author_id, body) values ('guestbook', 'guestbook', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'too soon')$$,
  'P0001', '发布太快了，请在 30 秒后再试', 'comments have a 30-second cooldown'
);
select ok(public.delete_comment('33333333-3333-4333-8333-333333333333'), 'authors can soft-delete their own comments');
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true);
select is(public.delete_comment('11111111-1111-4111-8111-111111111111'), false, 'other users cannot delete a comment');
select set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","role":"authenticated"}', true);
select ok(public.delete_comment('11111111-1111-4111-8111-111111111111'), 'site admins can soft-delete any comment');

select finish();
rollback;
```

- [ ] **Step 6: Run database tests and commit**

Run: `bun test tests/database-migration.test.ts`  
Expected: PASS.

Run when Docker is available: `bunx supabase start && bunx supabase test db`  
Expected: every pgTAP assertion passes. If Docker is unavailable, record this exact environmental blocker and run the same test file against the linked Supabase development database inside a rollback transaction before production migration.

```bash
git add supabase tests/database-migration.test.ts
git commit -m "feat: define secure interaction database"
```

---

### Task 3: Authentication Services, Login Page, Callback, and Header Identity

**Files:**
- Create: `src/lib/supabase/auth.ts`
- Create: `src/components/auth/AuthStatus.astro`
- Create: `src/components/auth/AuthForms.astro`
- Create: `src/components/layout/Header.astro`
- Create: `src/pages/login.astro`
- Create: `src/pages/auth/callback.astro`
- Modify: `src/layouts/BaseLayout.astro`
- Modify: `src/site.config.ts`
- Create: `tests/auth.test.ts`
- Modify: `tests/pages.test.ts`

**Interfaces:**
- Produces: `getSessionUser()`, `signInWithGithub()`, `signInWithPassword()`, `signUpWithPassword()`, `signOut()`, `mapAuthError()` and `cc:auth-change` browser events.
- Consumes: `getSupabaseClient()` from Task 1.

- [ ] **Step 1: Write failing auth behavior tests**

```ts
import { describe, expect, test } from 'bun:test'
import { mapAuthError, validateRegistration } from '../src/lib/supabase/auth'

describe('authentication helpers', () => {
  test('requires matching passwords with at least eight characters', () => {
    expect(validateRegistration('1234567', '1234567')).toBe('密码至少需要 8 位')
    expect(validateRegistration('abcdefgh', 'abcdefgi')).toBe('两次输入的密码不一致')
    expect(validateRegistration('abcdefgh', 'abcdefgh')).toBeNull()
  })

  test('maps common Supabase errors to Chinese', () => {
    expect(mapAuthError('Invalid login credentials')).toBe('邮箱或密码不正确')
    expect(mapAuthError('Email not confirmed')).toBe('请先完成邮箱验证')
    expect(mapAuthError('other')).toBe('操作失败，请稍后重试')
  })
})
```

- [ ] **Step 2: Run RED, implement auth helpers, then verify GREEN**

Run: `bun test tests/auth.test.ts`  
Expected: FAIL because the auth module is absent.

Implement the validation and error map exactly as asserted, plus thin async wrappers around Supabase Auth. GitHub login must use `redirectTo: new URL('/auth/callback', location.origin).toString()`; email signup must use the same callback in `emailRedirectTo`. All wrappers return `{ data, error }` unchanged so UI code can display mapped errors.

Run: `bun test tests/auth.test.ts`  
Expected: PASS.

- [ ] **Step 3: Build the login and callback pages**

`AuthForms.astro` contains separate login/register forms, a GitHub button, visible labels, an `aria-live="polite"` status area, and browser script handlers. Password values are never logged or persisted by custom code. `/auth/callback` calls `getSession()`, dispatches `cc:auth-change`, then redirects to a validated same-origin `next` query value or `/`.

Add structure assertions to `tests/pages.test.ts`:

```ts
test('v2 authentication pages expose accessible controls', () => {
  const login = read('src/components/auth/AuthForms.astro')
  expect(login).toContain('使用 GitHub 登录')
  expect(login).toContain('type="email"')
  expect(login).toContain('type="password"')
  expect(login).toContain('aria-live')
  expect(read('src/pages/auth/callback.astro')).toContain('auth/callback')
})
```

- [ ] **Step 4: Extend the theme header without editing node_modules**

Copy `node_modules/astro-pure/components/basic/Header.astro` to `src/components/layout/Header.astro`, keep its theme/menu behavior, import `AuthStatus`, and render `<AuthStatus />` beside the theme button. Replace the `Header` import in `BaseLayout.astro` with the local component. Add `{ title: '留言', link: '/guestbook' }` to `site.config.ts`.

`AuthStatus.astro` renders a login link by default, then replaces it with escaped nickname/avatar and a logout button after `getSessionUser()` succeeds. It listens for `cc:auth-change`; all user strings are assigned through `textContent` or safe attributes, never `innerHTML`.

- [ ] **Step 5: Run checks and commit**

Run: `bun test tests/auth.test.ts tests/pages.test.ts && bun run check`  
Expected: PASS and zero diagnostics.

```bash
git add src/lib/supabase/auth.ts src/components/auth src/components/layout src/pages/login.astro src/pages/auth src/layouts/BaseLayout.astro src/site.config.ts tests
git commit -m "feat: add GitHub and email authentication UI"
```

---

### Task 4: Generic Comment Thread and Login-Only Guestbook

**Files:**
- Create: `src/lib/supabase/comments.ts`
- Create: `src/components/comments/CommentThread.astro`
- Create: `src/pages/guestbook.astro`
- Create: `tests/comments.test.ts`
- Modify: `tests/pages.test.ts`

**Interfaces:**
- Produces: `listComments(target)`, `createComment(input)`, `removeComment(id)`, `groupComments(rows)`, and `<CommentThread targetType targetKey />`.
- Consumes: `CommentRow`, `CommentTarget`, `getSupabaseClient()`, and current Auth session.

- [ ] **Step 1: Write failing comment-tree tests**

```ts
import { describe, expect, test } from 'bun:test'
import { groupComments, validateCommentBody } from '../src/lib/supabase/comments'
import type { CommentRow } from '../src/lib/supabase/database.types'

const row = (id: string, parent_id: string | null, created_at: string): CommentRow => ({
  author_id: `author-${id}`, body: id, created_at, deleted_at: null, id, parent_id,
  target_key: 'guestbook', target_type: 'guestbook'
})

describe('comments', () => {
  test('sorts roots newest first and replies oldest first', () => {
    const result = groupComments([
      row('old', null, '2026-01-01T00:00:00Z'),
      row('new', null, '2026-01-02T00:00:00Z'),
      row('reply-b', 'new', '2026-01-02T02:00:00Z'),
      row('reply-a', 'new', '2026-01-02T01:00:00Z')
    ])
    expect(result.map((item) => item.comment.id)).toEqual(['new', 'old'])
    expect(result[0].replies.map((item) => item.id)).toEqual(['reply-a', 'reply-b'])
  })

  test('validates trimmed length', () => {
    expect(validateCommentBody('   ')).toBe('请输入内容')
    expect(validateCommentBody('a'.repeat(1001))).toBe('内容不能超过 1000 字')
    expect(validateCommentBody(' hello ')).toBeNull()
  })
})
```

- [ ] **Step 2: Run RED and implement the data module**

Run: `bun test tests/comments.test.ts`  
Expected: FAIL because the comments module is absent.

Implement `groupComments()` with a `Map` keyed by root ID, discard orphaned replies from display, sort roots descending and replies ascending. Implement Supabase queries selecting comments plus `profiles(display_name, avatar_url)`, insert using the current user ID, and call `rpc('delete_comment', { comment_id: id })` for deletion.

- [ ] **Step 3: Build the safe comment custom element**

`CommentThread.astro` renders an empty shell and registers a custom element that:

- Displays public comments even without a session.
- Displays a login link instead of the composer when signed out.
- Creates all user-content nodes with `document.createElement()` and `textContent`.
- Shows “该内容已删除” when `body === null`.
- Shows reply controls only for top-level active comments.
- Shows delete controls only for the author or when `is_site_admin()` returns true.
- Preserves textarea contents on request failure.
- Maps database cooldown/validation messages to the visible `aria-live` status.

The component props are exact:

```ts
interface Props {
  targetKey: string
  targetType: 'guestbook' | 'post'
}
```

- [ ] **Step 4: Create the guestbook page and tests**

Create `/guestbook` with title “留言板”, short copy explaining that reading is public and posting requires login, and `<CommentThread targetType="guestbook" targetKey="guestbook" />`.

```ts
test('guestbook reuses the authenticated comment thread', () => {
  const page = read('src/pages/guestbook.astro')
  expect(page).toContain("targetType='guestbook'")
  expect(page).toContain("targetKey='guestbook'")
  expect(page).toContain('登录后')
})
```

- [ ] **Step 5: Verify and commit**

Run: `bun test tests/comments.test.ts tests/pages.test.ts && bun run check`  
Expected: PASS and zero diagnostics.

```bash
git add src/lib/supabase/comments.ts src/components/comments src/pages/guestbook.astro tests
git commit -m "feat: add secure comments and guestbook"
```

---

### Task 5: Article Likes and Blog Interaction Integration

**Files:**
- Create: `src/lib/supabase/likes.ts`
- Create: `src/components/likes/LikeButton.astro`
- Modify: `src/layouts/BlogPost.astro`
- Create: `tests/likes.test.ts`
- Modify: `tests/pages.test.ts`

**Interfaces:**
- Produces: `getLikeState(slug)`, `setLiked(slug, next)`, `optimisticLikeState(state)`, and `<LikeButton postSlug />`.
- Consumes: Auth session, `post_likes`, `CommentThread`, and the article collection entry ID.

- [ ] **Step 1: Write a failing optimistic-state test**

```ts
import { describe, expect, test } from 'bun:test'
import { optimisticLikeState } from '../src/lib/supabase/likes'

describe('optimisticLikeState', () => {
  test('increments on like and decrements without going below zero', () => {
    expect(optimisticLikeState({ count: 2, liked: false })).toEqual({ count: 3, liked: true })
    expect(optimisticLikeState({ count: 0, liked: true })).toEqual({ count: 0, liked: false })
  })
})
```

- [ ] **Step 2: Run RED and implement likes**

Run: `bun test tests/likes.test.ts`  
Expected: FAIL because the likes module is absent.

Implement `getLikeState()` as a count query plus a current-user existence query. Implement `setLiked()` as an insert for `true` and a `.delete().match({ post_slug, user_id })` for `false`. `optimisticLikeState()` returns the exact values asserted above.

- [ ] **Step 3: Build accessible like UI and integrate comments**

`LikeButton.astro` must expose `aria-pressed`, a visible count, logged-out redirect to `/login?next=<current article>`, immediate optimistic feedback, rollback on error, and an `aria-live` status.

Modify the bottom of `BlogPost.astro` so each article renders:

```astro
<section class='article-interactions' aria-label='文章互动'>
  <LikeButton postSlug={id} />
  <CommentThread targetType='post' targetKey={id} />
</section>
```

Place this before copyright/recommendations and add the required imports.

- [ ] **Step 4: Verify and commit**

Run: `bun test tests/likes.test.ts tests/pages.test.ts && bun run check`  
Expected: PASS and zero diagnostics.

```bash
git add src/lib/supabase/likes.ts src/components/likes src/layouts/BlogPost.astro tests
git commit -m "feat: add article likes and comment threads"
```

---

### Task 6: Deterministic Import of Five Obsidian Articles

**Files:**
- Create: `src/utils/obsidian-import.ts`
- Create: `scripts/import-obsidian-posts.ts`
- Create: `tests/obsidian-import.test.ts`
- Create: `tests/articles.test.ts`
- Create: `src/content/blog/obsidian-ai-agent-claudian-skills.md`
- Create: `src/content/blog/obsidian-cli-core-principles.md`
- Create: `src/content/blog/git-advanced-version-branch.md`
- Create: `src/content/blog/obsidian-essential-skills.md`
- Create: `src/content/blog/obsidian-cli-command-reference.md`
- Modify: `src/assets/styles/app.css`
- Modify: `src/pages/blog/[...page].astro`

**Interfaces:**
- Produces: `convertObsidianMarkdown(source)`, deterministic article frontmatter, and five public collection entries.
- Consumes: the five exact source paths approved in the design spec.

- [ ] **Step 1: Write failing conversion tests**

```ts
import { describe, expect, test } from 'bun:test'
import { convertObsidianMarkdown } from '../src/utils/obsidian-import'

describe('convertObsidianMarkdown', () => {
  test('converts Obsidian callouts and demotes body h1 headings', () => {
    const source = '> [!warning]+ 核心区别\n> 请谨慎操作\n\n# 第二部分\n正文'
    const result = convertObsidianMarkdown(source)
    expect(result).toContain('> **警告 · 核心区别**')
    expect(result).toContain('## 第二部分')
    expect(result).not.toContain('[!warning]')
  })

  test('normalizes non-breaking spaces without changing credential placeholders', () => {
    expect(convertObsidianMarkdown('git\u00a0log\nANTHROPIC_API_KEY=你的智谱api key'))
      .toBe('git log\nANTHROPIC_API_KEY=你的智谱api key')
  })

  test('renders command lines inside bash callouts as fenced code', () => {
    const result = convertObsidianMarkdown('> [!bash]+ 查看历史\n> git log -- notes.md')
    expect(result).toContain('> **命令 · 查看历史**')
    expect(result).toContain('> ```bash\n> git log -- notes.md\n> ```')
  })
})
```

- [ ] **Step 2: Run RED and implement the converter**

Run: `bun test tests/obsidian-import.test.ts`  
Expected: FAIL because the converter does not exist.

```ts
const CALLOUT_LABELS: Record<string, string> = {
  bash: '命令', danger: '危险', info: '信息', success: '成功', tip: '提示', warning: '警告'
}

export function convertObsidianMarkdown(source: string) {
  return source
    .replaceAll('\u00a0', ' ')
    .replace(/^# /gm, '## ')
    .replace(/^> \[!(bash|danger|info|success|tip|warning)\]\+?\s*(.*)$/gm,
      (_, type: string, title: string) => `> **${CALLOUT_LABELS[type]}${title ? ` · ${title.trim()}` : ''}**`)
    .replace(
      /^> ((?:git|obsidian|python|node|npx|bun|npm|ANTHROPIC_[A-Z_]+=).*)$/gm,
      '> ```bash\n> $1\n> ```'
    )
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
```

- [ ] **Step 3: Implement the exact source mapping importer**

The script uses `statSync(source).mtime`, formats it as `YYYY-MM-DD`, calls `convertObsidianMarkdown`, prepends valid frontmatter, and writes the five paths below with `Bun.write()`:

```ts
const posts = [
  { source: 'G:/Obsidian Vault/Obsidian/Obsidian AI Agent 配置指南：Claudian + Obsidian Skills.md', slug: 'obsidian-ai-agent-claudian-skills', title: 'Obsidian AI Agent 配置指南：Claudian + Obsidian Skills', description: '在 Obsidian 中配置 Claudian 与 Obsidian Skills，构建本地优先的 AI Agent 工作流。', tags: ['obsidian', 'ai-agent', 'claudian', 'skills'] },
  { source: 'G:/Obsidian Vault/Obsidian/Obsidian CLI 核心原理.md', slug: 'obsidian-cli-core-principles', title: 'Obsidian CLI 核心原理', description: '理解 Obsidian CLI 的架构、Agent 集成方式与自动化工作流。', tags: ['obsidian', 'cli', 'ai-agent', '自动化'] },
  { source: 'G:/Obsidian Vault/Obsidian/Git 进阶操作：版本管理，分支管理.md', slug: 'git-advanced-version-branch', title: 'Git 进阶操作：版本管理与分支管理', description: '用 Git log、restore、revert、reset、blame 与分支操作管理笔记和代码版本。', tags: ['git', '版本管理', '分支管理'] },
  { source: 'G:/Obsidian Vault/Obsidian/Obsidian 必装 Skills.md', slug: 'obsidian-essential-skills', title: 'Obsidian 必装 Skills', description: '整理适合 Obsidian AI 工作流的 Skills、用途、依赖与风险。', tags: ['obsidian', 'skills', 'ai-agent'] },
  { source: 'G:/Obsidian Vault/Obsidian/Obsidian 官方 CLI 命令全景速查表.md', slug: 'obsidian-cli-command-reference', title: 'Obsidian 官方 CLI 命令全景速查表', description: '按模块速查 Obsidian CLI 命令、完整样例和典型自动化场景。', tags: ['obsidian', 'cli', '速查表'] }
] as const
```

Frontmatter fields are `title`, `description`, `publishDate`, `tags`, `language: zh-CN`, and `draft: false`. JSON-encode all string/array values so punctuation cannot break YAML.

- [ ] **Step 4: Run the import and add content assertions**

Run: `bun scripts/import-obsidian-posts.ts`  
Expected: five Markdown files are created.

`tests/articles.test.ts` must load all five files and assert exact titles/slugs, required frontmatter, absence of `> [!`, absence of real-looking `sk-`/`AKIA`/private-key material, retention of `ANTHROPIC_API_KEY=你的智谱api key`, and at least one body heading in each article.

- [ ] **Step 5: Add responsive prose tables and update empty copy**

Add CSS targeting `.prose table` with `display: block; max-width: 100%; overflow-x: auto; white-space: nowrap` on narrow screens, while restoring normal table layout above `768px`. Change “还没有文章，第一篇正在路上。” to wording that is only shown when the collection is genuinely empty and update the old structure test accordingly.

- [ ] **Step 6: Verify import and commit**

Run: `bun test tests/obsidian-import.test.ts tests/articles.test.ts tests/content-cleanup.test.ts tests/pages.test.ts`  
Expected: PASS.

Run: `bun run build`  
Expected: five posts, tag pages, archive pages, Pagefind index, sitemap, and RSS build successfully.

```bash
git add src/content/blog src/utils/obsidian-import.ts scripts/import-obsidian-posts.ts src/assets/styles/app.css src/pages/blog tests
git commit -m "feat: publish initial Obsidian article collection"
```

---

### Task 7: Remote Supabase Configuration, E2E Verification, Tokyo Deployment

**Files:**
- Create: `vercel.json`
- Create: `tests/e2e/v2.spec.ts`
- Modify: `.gitignore` only if Playwright output paths are missing
- Modify: `README.md`

**Interfaces:**
- Produces: migrated production schema, configured Auth redirect URLs/providers, seeded CC administrator, automated browser acceptance coverage, and a deployed production V2.
- Consumes: all application modules, the linked Vercel project `cc-xgmx2005`, the linked Supabase project, and the known admin email `2463323447@qq.com`.

- [ ] **Step 1: Pin Vercel Functions to Tokyo and test the config**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "regions": ["hnd1"]
}
```

Add a Bun test that parses `vercel.json` and expects `regions` to equal `['hnd1']`.

- [ ] **Step 2: Pull linked Vercel variables without printing secret values**

Authenticate the Vercel CLI through its browser device flow, then run:

```powershell
vercel env pull .env.local --environment=development --yes
```

Verify names only:

```powershell
Get-Content .env.local | ForEach-Object {
  if ($_ -match '^\s*([^#=]+)=') { $Matches[1].Trim() }
}
```

Expected names include `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `POSTGRES_URL_NON_POOLING`, and must not be committed.

- [ ] **Step 3: Apply the migration and run linked database checks**

Load `.env.local` into the current PowerShell process without echoing values, then run:

```powershell
bunx supabase db push --db-url $env:POSTGRES_URL_NON_POOLING
bunx supabase db lint --db-url $env:POSTGRES_URL_NON_POOLING --level warning
```

Run the pgTAP file against the linked database inside its built-in transaction and confirm every assertion passes before leaving the migration in production.

- [ ] **Step 4: Configure Auth providers and safe redirect URLs**

In Supabase Dashboard:

- Site URL: `https://cc-xgmx2005.vercel.app`
- Redirect allow list: `http://localhost:4321/auth/callback`, `https://cc-xgmx2005.vercel.app/auth/callback`, and Vercel preview wildcard allowed by Supabase's documented syntax.
- Email provider: enabled, confirm email enabled.
- Custom SMTP: configured directly in Dashboard with the user's SMTP authorization code; never paste it into source, chat output, or shell logs.
- GitHub provider: enabled with a GitHub OAuth App callback equal to the Supabase project's displayed `/auth/v1/callback` URL.

This is a user-visible authentication checkpoint; stop only if Dashboard requires a password, SMTP authorization code, CAPTCHA, or GitHub confirmation that the user must enter.

- [ ] **Step 5: Seed CC as administrator after first successful login**

After CC signs in once using `2463323447@qq.com`, run through the SQL editor or non-pooling connection:

```sql
insert into public.site_admins(user_id)
select id from auth.users where email = '2463323447@qq.com'
on conflict (user_id) do nothing;
```

Verify `select public.is_site_admin()` returns true under CC's authenticated session and false under a normal test user.

- [ ] **Step 6: Add browser acceptance tests**

Install `@playwright/test` as a dev dependency. The E2E suite must use test accounts supplied only via ignored environment variables and cover:

```ts
import { expect, test } from '@playwright/test'

test('public visitor can read but is prompted to log in before writing', async ({ page }) => {
  await page.goto('/guestbook')
  await expect(page.getByRole('heading', { name: '留言板' })).toBeVisible()
  await expect(page.getByRole('link', { name: /登录/ })).toBeVisible()
})

test('article exposes likes and comments', async ({ page }) => {
  await page.goto('/blog/git-advanced-version-branch')
  await expect(page.getByRole('heading', { name: 'Git 进阶操作：版本管理与分支管理' })).toBeVisible()
  await expect(page.getByRole('button', { name: /点赞/ })).toBeVisible()
  await expect(page.getByRole('region', { name: '评论区' })).toBeVisible()
})
```

Add authenticated setup and tests for email login, post comment, reply, own soft deletion, guestbook message, like/unlike, cross-user delete denial, and CC admin deletion. Tests create uniquely prefixed data and soft-delete it in teardown.

- [ ] **Step 7: Run the complete verification suite**

Run:

```powershell
bun test
bun run check
bun run build
bunx playwright test
rg -n "SUPABASE_SECRET_KEY|POSTGRES_PASSWORD|POSTGRES_URL=" dist .vercel/output/static
```

Expected: all tests pass, Astro reports zero errors/warnings/hints, production build succeeds, E2E flows pass, and the secret scan returns no matches. Empty-result exit code from `rg` is success for the security check.

- [ ] **Step 8: Document operations, commit, push, and verify production**

Update README with local env variable names, migration/test commands, article import command, and an explicit statement that Oracle backup automation is the next independent operations task.

```bash
git add vercel.json tests/e2e package.json bun.lock README.md .gitignore
git commit -m "feat: complete personal website v2"
git push origin main
```

Wait for Vercel production deployment, then verify HTTP 200 for `/`, `/blog`, all five article slugs, `/login`, `/auth/callback`, `/guestbook`, `/search`, and `/rss.xml`. Verify the public site supports GitHub login, verified email login, likes, post comments, one-level replies, soft deletion, guestbook posting, and CC administrator deletion.

---

## Plan Self-Review

- **Spec coverage:** Tasks 1–7 cover public configuration, schema/RLS, both login methods, identity UI, likes, comments, one-level replies, guestbook, admin deletion, five articles, responsive tables, Tokyo deployment, automated tests, and production verification. Oracle backup remains explicitly separated as required by the approved design.
- **Security boundary:** Only the publishable URL/key enter the browser; `site_admins` has no client write policy; user content is rendered with `textContent`; direct comment updates/deletes are absent; secret values are never printed or committed.
- **Type consistency:** `CommentTarget`, `CommentRow`, RPC names, component props, database column names, and environment variable names are identical across tasks.
- **No hidden content rewrite:** The importer uses the approved source mapping and pure compatibility conversion; article wording is not regenerated.
