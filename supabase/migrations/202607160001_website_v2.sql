create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

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
  parent_id uuid references public.comments(id) on delete set null,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (target_type <> 'guestbook' or target_key = 'guestbook'),
  check (
    (deleted_at is null and body is not null and char_length(body) between 1 and 1000)
    or (deleted_at is not null and body is null)
  )
);

create index comments_target_created_idx
  on public.comments(target_type, target_key, created_at desc);
create index comments_parent_idx on public.comments(parent_id);
create index comments_author_created_idx on public.comments(author_id, created_at desc);

create table public.post_likes (
  post_slug text not null check (char_length(post_slug) between 1 and 160),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_slug, user_id)
);

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles(id, display_name, avatar_url)
  values (
    new.id,
    left(
      coalesce(
        nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
        nullif(trim(new.raw_user_meta_data ->> 'user_name'), ''),
        nullif(split_part(new.email, '@', 1), ''),
        '新朋友'
      ),
      50
    ),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

insert into public.profiles(id, display_name, avatar_url)
select
  id,
  left(
    coalesce(
      nullif(trim(raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(raw_user_meta_data ->> 'user_name'), ''),
      nullif(split_part(email, '@', 1), ''),
      '新朋友'
    ),
    50
  ),
  nullif(raw_user_meta_data ->> 'avatar_url', '')
from auth.users
on conflict (id) do nothing;

create or replace function private.set_profile_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger set_profile_updated_at
before update on public.profiles
for each row execute function private.set_profile_updated_at();

create or replace function private.validate_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_row public.comments%rowtype;
begin
  if auth.uid() is null or new.author_id <> auth.uid() then
    raise exception '评论作者与当前登录用户不一致' using errcode = '42501';
  end if;

  new.body := trim(new.body);
  new.created_at := now();
  new.deleted_at := null;

  if new.body is null or char_length(new.body) not between 1 and 1000 then
    raise exception '评论内容需要在 1–1000 字之间' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.comments
    where author_id = new.author_id
      and created_at > now() - interval '30 seconds'
  ) then
    raise exception '发布太快了，请在 30 秒后再试' using errcode = 'P0001';
  end if;

  if new.parent_id is not null then
    select * into parent_row
    from public.comments
    where id = new.parent_id;

    if not found
      or parent_row.parent_id is not null
      or parent_row.target_type <> new.target_type
      or parent_row.target_key <> new.target_key then
      raise exception '只能回复同一页面的顶级评论' using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

create trigger validate_comment_before_insert
before insert on public.comments
for each row execute function private.validate_comment();

create or replace function public.is_site_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.site_admins
      where user_id = auth.uid()
    );
$$;

create or replace function public.delete_comment(comment_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return false;
  end if;

  update public.comments
  set body = null, deleted_at = now()
  where public.comments.id = $1
    and deleted_at is null
    and (author_id = auth.uid() or public.is_site_admin());

  return found;
end;
$$;

alter table public.profiles enable row level security;
alter table public.site_admins enable row level security;
alter table public.comments enable row level security;
alter table public.post_likes enable row level security;

create policy profiles_public_read
on public.profiles for select
to anon, authenticated
using (true);

create policy profiles_insert_own
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

create policy profiles_update_own
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy comments_public_read
on public.comments for select
to anon, authenticated
using (true);

create policy comments_insert_own
on public.comments for insert
to authenticated
with check ((select auth.uid()) = author_id);

create policy likes_public_read
on public.post_likes for select
to anon, authenticated
using (true);

create policy likes_insert_own
on public.post_likes for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy likes_delete_own
on public.post_likes for delete
to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.comments from anon, authenticated;
revoke all on table public.post_likes from anon, authenticated;
revoke all on table public.site_admins from anon, authenticated;

grant select on table public.profiles, public.comments, public.post_likes
to anon, authenticated;
grant insert (id, display_name, avatar_url) on table public.profiles to authenticated;
grant update (display_name, avatar_url) on table public.profiles to authenticated;
grant insert (id, target_type, target_key, parent_id, author_id, body)
on table public.comments to authenticated;
grant insert (post_slug, user_id) on table public.post_likes to authenticated;
grant delete on table public.post_likes to authenticated;

revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function private.set_profile_updated_at() from public, anon, authenticated;
revoke all on function private.validate_comment() from public, anon, authenticated;
revoke all on function public.is_site_admin() from public, anon, authenticated;
revoke all on function public.delete_comment(uuid) from public, anon, authenticated;
grant execute on function public.is_site_admin() to authenticated;
grant execute on function public.delete_comment(uuid) to authenticated;
