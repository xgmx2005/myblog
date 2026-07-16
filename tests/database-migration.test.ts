import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync, readdirSync } from 'node:fs'

const migrationsDirectory = new URL('../supabase/migrations/', import.meta.url)

function findMigration() {
  if (!existsSync(migrationsDirectory)) return null
  const filename = readdirSync(migrationsDirectory).find((entry) => entry.endsWith('_website_v2.sql'))
  return filename ? new URL(filename, migrationsDirectory) : null
}

describe('website v2 migration', () => {
  test('defines the complete secured interaction schema', () => {
    const migrationPath = findMigration()
    expect(migrationPath).not.toBeNull()
    if (!migrationPath) return

    const sql = readFileSync(migrationPath, 'utf8').toLowerCase()
    for (const fragment of [
      'create schema if not exists private',
      'create table public.profiles',
      'create table public.site_admins',
      'create table public.comments',
      'create table public.post_likes',
      'create or replace function public.delete_comment',
      'enable row level security',
      "interval '30 seconds'",
      'grant insert (id, target_type, target_key, parent_id, author_id, body)',
      'revoke all on table public.site_admins'
    ]) {
      expect(sql).toContain(fragment)
    }
  })

  test('does not expose direct comment mutation or administrator writes', () => {
    const migrationPath = findMigration()
    expect(migrationPath).not.toBeNull()
    if (!migrationPath) return

    const sql = readFileSync(migrationPath, 'utf8').toLowerCase()
    expect(sql).not.toContain('for update on public.comments')
    expect(sql).not.toContain('for delete on public.comments')
    expect(sql).not.toContain('for insert on public.site_admins')
  })
})
