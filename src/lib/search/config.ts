export type PublicSearchEnv = Record<string, string | undefined>

export function resolveSearchConfig(env: PublicSearchEnv) {
  const appId = env.PUBLIC_ALGOLIA_APP_ID?.trim() ?? ''
  const apiKey = env.PUBLIC_ALGOLIA_SEARCH_API_KEY?.trim() ?? ''
  const indexName = env.PUBLIC_ALGOLIA_INDEX_NAME?.trim() ?? ''

  if (!appId || !apiKey || !indexName) {
    return { algolia: null, mode: 'pagefind' as const }
  }

  return {
    algolia: { apiKey, appId, indexName },
    mode: 'algolia' as const
  }
}

export const searchConfig = resolveSearchConfig(import.meta.env)
