/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_WALINE_SERVER_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
