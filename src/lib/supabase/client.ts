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
