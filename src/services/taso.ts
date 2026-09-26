const PROXY = 'https://taso-proxy.sakkoja.workers.dev/volley'
const ORIGIN = 'https://lentopallo-api.torneopal.net/taso/rest'
const KEY = 'df8e84j9xtdz269euy3h'

export async function volleyGet(path: string): Promise<Record<string, unknown> | null> {
  const sep = path.includes('?') ? '&' : '?'
  const urls = [
    `${PROXY}/${path}`,
    `${ORIGIN}/${path}`,
    `${ORIGIN}/${path}${sep}_cb=${Date.now()}`,
  ]
  for (const url of urls) {
    try {
      const viaProxy = url.includes('taso-proxy')
      const res = await fetch(url, {
        headers: viaProxy
          ? { Accept: 'application/json' }
          : { Accept: `json/${KEY}`, Referer: 'https://tulospalvelu.lentopallo.fi/' },
      })
      if (!res.ok) continue
      const text = await res.text()
      const i = text.indexOf('{')
      if (i < 0) continue
      const data = JSON.parse(text.slice(i)) as Record<string, unknown> & {
        call?: { status?: string }
        error?: string
      }
      if (data.error === 'upstream') continue
      const status = String(data.call?.status || '').toLowerCase()
      if (status && status !== 'ok') continue
      return data
    } catch {
      /* next */
    }
  }
  return null
}

export function asList(data: Record<string, unknown> | null, key: string): Record<string, unknown>[] {
  const v = data?.[key]
  return Array.isArray(v) ? (v as Record<string, unknown>[]) : []
}
