begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(17);

select extensions.has_table('public', 'comments', 'comments table exists');
select extensions.has_pk('public', 'post_likes', 'likes have a composite primary key');
select extensions.policies_are(
  'public',
  'comments',
  array['comments_insert_own', 'comments_public_read']
);
select extensions.policies_are(
  'public',
  'post_likes',
  array['likes_delete_own', 'likes_insert_own', 'likes_public_read']
);
select extensions.function_returns('public', 'delete_comment', array['uuid'], 'boolean');
select extensions.function_returns('public', 'is_site_admin', array[]::text[], 'boolean');
select extensions.col_is_null('public', 'comments', 'body', 'soft deletion allows a null body');
select extensions.col_not_null('public', 'comments', 'target_key', 'every thread has a target key');

insert into auth.users(
  id,
  email,
  aud,
  role,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'alice@example.com', 'authenticated', 'authenticated', '', now(), '{}', '{}', now(), now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'bob@example.com', 'authenticated', 'authenticated', '', now(), '{}', '{}', now(), now()),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'admin@example.com', 'authenticated', 'authenticated', '', now(), '{}', '{}', now(), now());

insert into public.site_admins(user_id)
values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc');

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}',
  true
);

insert into public.post_likes(post_slug, user_id)
values ('test-post', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

select extensions.throws_like(
  $$insert into public.post_likes(post_slug, user_id) values ('test-post', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$$,
  '%duplicate key value violates unique constraint%',
  'a user can like a post only once'
);

select extensions.lives_ok(
  $$insert into public.comments(id, target_type, target_key, author_id, body) values ('11111111-1111-4111-8111-111111111111', 'post', 'test-post', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'root')$$,
  'an authenticated user can create a root comment'
);

reset role;
update public.comments
set created_at = now() - interval '2 minutes'
where id = '11111111-1111-4111-8111-111111111111';

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}',
  true
);

select extensions.lives_ok(
  $$insert into public.comments(id, target_type, target_key, parent_id, author_id, body) values ('22222222-2222-4222-8222-222222222222', 'post', 'test-post', '11111111-1111-4111-8111-111111111111', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'reply')$$,
  'a user can reply to a root comment'
);

reset role;
update public.comments
set created_at = now() - interval '2 minutes'
where id = '22222222-2222-4222-8222-222222222222';

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}',
  true
);

select extensions.throws_ok(
  $$insert into public.comments(target_type, target_key, parent_id, author_id, body) values ('post', 'test-post', '22222222-2222-4222-8222-222222222222', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'nested')$$,
  '23514',
  '只能回复同一页面的顶级评论',
  'second-level replies are rejected'
);

select extensions.lives_ok(
  $$insert into public.comments(id, target_type, target_key, author_id, body) values ('33333333-3333-4333-8333-333333333333', 'guestbook', 'guestbook', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'first recent message')$$,
  'a user can leave a guestbook message'
);

select extensions.throws_ok(
  $$insert into public.comments(target_type, target_key, author_id, body) values ('guestbook', 'guestbook', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'too soon')$$,
  'P0001',
  '发布太快了，请在 30 秒后再试',
  'comments have a 30-second cooldown'
);

select extensions.ok(
  public.delete_comment('33333333-3333-4333-8333-333333333333'),
  'authors can soft-delete their own comments'
);

select extensions.is(
  public.delete_comment('11111111-1111-4111-8111-111111111111'),
  false,
  'other users cannot delete a comment'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","role":"authenticated"}',
  true
);

select extensions.ok(
  public.delete_comment('11111111-1111-4111-8111-111111111111'),
  'site admins can soft-delete any comment'
);

select * from extensions.finish();
rollback;
