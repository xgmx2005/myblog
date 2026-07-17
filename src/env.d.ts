/// <reference types="astro/client" />

declare module '@docsearch/css'

interface ImportMetaEnv {
  readonly PUBLIC_ALGOLIA_APP_ID?: string
  readonly PUBLIC_ALGOLIA_INDEX_NAME?: string
  readonly PUBLIC_ALGOLIA_SEARCH_API_KEY?: string
  readonly PUBLIC_WALINE_SERVER_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
