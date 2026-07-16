export type PublicWalineEnv = Record<string, string | undefined>

export function normalizeWalinePath(input: string) {
  const pathname = input.split(/[?#]/, 1)[0] || '/'
  const withLeadingSlash = pathname.startsWith('/') ? pathname : `/${pathname}`
  return withLeadingSlash === '/' ? '/' : withLeadingSlash.replace(/\/+$/, '')
}

export function resolveWalineConfig(env: PublicWalineEnv) {
  const candidate = env.PUBLIC_WALINE_SERVER_URL?.trim().replace(/\/+$/, '') ?? ''

  try {
    const url = new URL(candidate)
    const local = url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)
    const enabled = url.protocol === 'https:' || local

    return enabled
      ? { enabled: true, serverURL: candidate }
      : { enabled: false, serverURL: '' }
  } catch {
    return { enabled: false, serverURL: '' }
  }
}

export const walineConfig = resolveWalineConfig(import.meta.env)
