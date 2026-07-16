export type PublicSupabaseEnv = Record<string, string | undefined>

export function resolveSupabaseConfig(env: PublicSupabaseEnv) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ''
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? ''

  return { enabled: Boolean(url && key), key, url }
}

export const supabaseConfig = resolveSupabaseConfig(import.meta.env)
